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

    class Meta:
        model = Constituency
        fields = ['id', 'name', 'category', 'district', 'district_name']

class ElectionSerializer(serializers.ModelSerializer):
    is_currently_open = serializers.BooleanField(read_only=True)
    state_name = serializers.CharField(source='state.name', read_only=True)
    on_chain_tx_hash = serializers.CharField(read_only=True)
    creation_tx_hash = serializers.RegexField(regex=r'^0x[0-9a-fA-F]{64}$', write_only=True, required=False)

    class Meta:
        model = Election
        fields = [
            'id', 'name', 'year', 'scope', 'state', 'state_name',
            'start_time', 'end_time', 'status', 'on_chain_tx_hash', 'creation_tx_hash',
            'created_at', 'is_currently_open'
        ]
        read_only_fields = ['status', 'created_at', 'is_currently_open']

    def validate(self, attrs):
        start = attrs.get('start_time', getattr(self.instance, 'start_time', None))
        end = attrs.get('end_time', getattr(self.instance, 'end_time', None))
        if start and end and end <= start:
            raise serializers.ValidationError({'end_time': 'Election end time must be after its start time.'})
        return attrs
