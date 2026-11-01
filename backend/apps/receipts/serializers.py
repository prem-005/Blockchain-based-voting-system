from rest_framework import serializers
from .models import VoteReceipt
from apps.elections.models import Election, Constituency

class VoteReceiptSerializer(serializers.ModelSerializer):
    election_name = serializers.CharField(source='election.name', read_only=True)
    election_year = serializers.IntegerField(source='election.year', read_only=True)
    constituency_name = serializers.CharField(source='constituency.name', read_only=True)
    district_name = serializers.CharField(source='constituency.district.name', read_only=True)

    class Meta:
        model = VoteReceipt
        fields = [
            'id', 'receipt_ref', 'election', 'election_name', 'election_year',
            'constituency', 'constituency_name', 'district_name',
            'tx_hash', 'block_number', 'block_hash', 'nullifier_hash',
            'merkle_proof', 'gas_used', 'status', 'timestamp'
        ]
        read_only_fields = ['id', 'status', 'timestamp']

class RecordReceiptSerializer(serializers.Serializer):
    election = serializers.PrimaryKeyRelatedField(queryset=Election.objects.all())
    constituency = serializers.PrimaryKeyRelatedField(queryset=Constituency.objects.all())
    tx_hash = serializers.RegexField(regex=r'^0x[0-9a-fA-F]{64}$')
    nullifier_hash = serializers.RegexField(regex=r'^0x[0-9a-fA-F]{64}$')
