import hashlib
import hmac

from django.conf import settings
from web3 import Web3


def derive_nullifier(user_id, election_id):
    secret = getattr(settings, 'BALLOT_NULLIFIER_SECRET', '') or settings.SECRET_KEY
    message = f'lightvote-nullifier:v1:{user_id}:{election_id}'.encode('utf-8')
    return hmac.new(secret.encode('utf-8'), message, hashlib.sha256).digest()


def _hash_pair(left, right):
    first, second = sorted((left, right))
    return Web3.keccak(first + second)


def build_merkle_tree(leaves):
    """Build an OpenZeppelin-compatible sorted-pair Merkle tree and per-leaf proofs."""
    unique_leaves = sorted(set(bytes(leaf) for leaf in leaves))
    if not unique_leaves:
        return bytes(32), {}

    proofs = {leaf: [] for leaf in unique_leaves}
    nodes = [(leaf, [leaf]) for leaf in unique_leaves]
    while len(nodes) > 1:
        next_level = []
        for index in range(0, len(nodes), 2):
            left_hash, left_members = nodes[index]
            if index + 1 < len(nodes):
                right_hash, right_members = nodes[index + 1]
            else:
                right_hash, right_members = left_hash, left_members

            for leaf in left_members:
                proofs[leaf].append(right_hash)
            if right_hash is not left_hash:
                for leaf in right_members:
                    proofs[leaf].append(left_hash)

            members = left_members if right_hash is left_hash else left_members + right_members
            next_level.append((_hash_pair(left_hash, right_hash), members))
        nodes = next_level

    return nodes[0][0], proofs
