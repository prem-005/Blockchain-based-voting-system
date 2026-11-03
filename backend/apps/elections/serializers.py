from rest_framework import serializers
from .models import State, District, Constituency, Election

class StateSerializer(serializers.ModelSerializer):
    class Meta:
        model = State
        fields = ['id', 'name', 'code']

class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = ['id', 'name', 'code', 'state']

class ConstituencySerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source='district.name', read_only=True)
    state = serializers.IntegerField(source='district.state_id', read_only=True)

    class Meta:
        model = Constituency
        fields = ['id', 'name', 'category', 'district', 'district_name', 'state']

class ElectionSerializer(serializers.ModelSerializer):
    is_currently_open = serializers.BooleanField(read_only=True)
    state_name = serializers.CharField(source='state.name', read_only=True)
    on_chain_tx_hash = serializers.CharField(read_only=True)
    creation_tx_hash = serializers.RegexField(regex=r'^0x[0-9a-fA-F]{64}$', write_only=True, required=False)
    constituency_ids = serializers.PrimaryKeyRelatedField(
        source='constituencies', many=True, queryset=Constituency.objects.all(), required=False,
    )

    class Meta:
        model = Election
        fields = [
            'id', 'name', 'year', 'scope', 'state', 'state_name', 'constituency_ids',
            'start_time', 'end_time', 'status', 'on_chain_tx_hash', 'creation_tx_hash',
            'created_at', 'is_currently_open'
        ]
        read_only_fields = ['status', 'created_at', 'is_currently_open']

    def validate(self, attrs):
        start = attrs.get('start_time', getattr(self.instance, 'start_time', None))
        end = attrs.get('end_time', getattr(self.instance, 'end_time', None))
        if start and end and end <= start:
            raise serializers.ValidationError({'end_time': 'Election end time must be after its start time.'})
        scope = attrs.get('scope', getattr(self.instance, 'scope', Election.Scope.STATE_ASSEMBLY))
        state = attrs.get('state', getattr(self.instance, 'state', None))
        constituencies = attrs.get('constituencies')
        if scope == Election.Scope.BY_ELECTION and not constituencies and self.instance is None:
            raise serializers.ValidationError({'constituency_ids': 'Select at least one constituency for a by-election.'})
        if scope == Election.Scope.BY_ELECTION and constituencies is not None and not constituencies:
            raise serializers.ValidationError({'constituency_ids': 'Select at least one constituency for a by-election.'})
        if scope != Election.Scope.BY_ELECTION and constituencies:
            raise serializers.ValidationError({'constituency_ids': 'Only by-elections can be limited to selected constituencies.'})
        if state and constituencies and any(item.district.state_id != state.pk for item in constituencies):
            raise serializers.ValidationError({'constituency_ids': 'All selected constituencies must belong to the election state.'})
        return attrs
