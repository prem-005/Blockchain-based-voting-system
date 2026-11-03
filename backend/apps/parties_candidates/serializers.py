from rest_framework import serializers
from .models import Party, Candidate
from .blockchain import get_verified_candidate_registration
from apps.elections.models import Election

class PartySerializer(serializers.ModelSerializer):
    class Meta:
        model = Party
        fields = ['id', 'name', 'abbreviation', 'symbol_name', 'symbol_image', 'symbol_url', 'color_hex', 'is_active']

class CandidateSerializer(serializers.ModelSerializer):
    party_details = PartySerializer(source='party', read_only=True)
    district_name = serializers.CharField(source='district.name', read_only=True)
    constituency_name = serializers.CharField(source='constituency.name', read_only=True)
    election_name = serializers.CharField(source='election.name', read_only=True)
    election_year = serializers.IntegerField(source='election.year', read_only=True)
    candidate_id = serializers.IntegerField(read_only=True)
    candidate_ref = serializers.CharField(read_only=True)
    on_chain_tx_hash = serializers.CharField(read_only=True)
    registration_tx_hash = serializers.RegexField(regex=r'^0x[0-9a-fA-F]{64}$', write_only=True, required=False)

    class Meta:
        model = Candidate
        fields = [
            'id', 'candidate_id', 'candidate_ref', 'name', 'party',
            'party_details', 'election', 'election_name', 'election_year',
            'district', 'district_name', 'constituency', 'constituency_name',
            'photo', 'photo_url', 'affidavit_summary', 'is_active',
            'on_chain_tx_hash', 'registration_tx_hash', 'created_at'
        ]
        read_only_fields = ['created_at']

    def validate(self, attrs):
        if self.instance is None:
            tx_hash = attrs.pop('registration_tx_hash', None)
            if not tx_hash:
                raise serializers.ValidationError({'registration_tx_hash': 'A confirmed candidate registration transaction is required.'})
            try:
                chain_data = get_verified_candidate_registration(tx_hash)
            except ConnectionError as error:
                raise serializers.ValidationError({'registration_tx_hash': str(error)}) from error
            except Exception as error:
                raise serializers.ValidationError({'registration_tx_hash': f'Could not verify candidate registration: {error}'}) from error

            election = attrs.get('election')
            district = attrs.get('district')
            constituency = attrs.get('constituency')
            party = attrs.get('party')

            # Ensure each party has at most one official candidate per constituency
            if party and election and constituency:
                existing_nominee = Candidate.objects.filter(
                    election=election,
                    constituency=constituency,
                    party=party,
                    is_active=True
                )
                if self.instance:
                    existing_nominee = existing_nominee.exclude(pk=self.instance.pk)
                if existing_nominee.exists():
                    raise serializers.ValidationError({
                        'party': f"{party.name} ({party.abbreviation}) already has an active nominee ({existing_nominee.first().name}) in this constituency for this election."
                    })

            # Ensure unique candidate name in constituency
            cand_name = (attrs.get('name') or '').strip()
            if cand_name and election and constituency:
                existing_cand = Candidate.objects.filter(
                    election=election,
                    constituency=constituency,
                    name__iexact=cand_name
                )
                if self.instance:
                    existing_cand = existing_cand.exclude(pk=self.instance.pk)
                if existing_cand.exists():
                    raise serializers.ValidationError({
                        'name': f"A candidate named '{cand_name}' is already registered in this constituency."
                    })

            if not election or chain_data['election_id'] != election.pk:
                raise serializers.ValidationError({'election': 'Election does not match the confirmed chain registration.'})
            if not district or chain_data['district_id'] != district.pk:
                raise serializers.ValidationError({'district': 'District does not match the confirmed chain registration.'})
            if election and district and district.state_id != election.state_id:
                raise serializers.ValidationError({'district': 'Candidate district must belong to the election state.'})
            if not constituency or chain_data['constituency_id'] != constituency.pk or constituency.district_id != district.pk:
                raise serializers.ValidationError({'constituency': 'Constituency does not match the confirmed chain registration or selected district.'})
            if (election.scope == Election.Scope.BY_ELECTION and election.constituencies.exists()
                    and not election.constituencies.filter(pk=constituency.pk).exists()):
                raise serializers.ValidationError({'constituency': 'This constituency is not included in the selected by-election.'})
            if not party or chain_data['party_abbreviation'].lower() != party.abbreviation.lower():
                raise serializers.ValidationError({'party': 'Party does not match the confirmed chain registration.'})
            if chain_data['name'].strip() != (attrs.get('name') or '').strip():
                raise serializers.ValidationError({'name': 'Candidate name does not match the confirmed chain registration.'})
            attrs.update({
                'candidate_id': chain_data['candidate_id'],
                'candidate_ref': chain_data['candidate_ref'],
                'on_chain_tx_hash': chain_data['tx_hash'],
            })

        if self.instance is None or 'constituency' in attrs or 'district' in attrs:
            district = attrs.get('district') or getattr(self.instance, 'district', None)
            constituency = attrs.get('constituency') or getattr(self.instance, 'constituency', None)
            if district and constituency and constituency.district_id != district.pk:
                raise serializers.ValidationError({'constituency': 'Constituency does not belong to the selected district.'})
        if self.instance is not None:
            for field in ('election', 'district', 'constituency', 'candidate_id', 'candidate_ref', 'name', 'party'):
                if field in attrs and attrs[field] != getattr(self.instance, field):
                    raise serializers.ValidationError({field: 'This registered candidate identity field cannot be changed.'})
        return attrs
