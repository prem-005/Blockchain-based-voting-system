from django.test import SimpleTestCase
from web3 import Web3

from .eligibility import build_merkle_tree


def verify_sorted_proof(leaf, proof, root):
    value = leaf
    for sibling in proof:
        left, right = sorted((value, sibling))
        value = Web3.keccak(left + right)
    return value == root


class EligibilityMerkleTreeTests(SimpleTestCase):
    def test_single_eligible_voter_has_leaf_as_root_and_empty_proof(self):
        leaf = Web3.keccak(text='voter-a')
        root, proofs = build_merkle_tree([leaf])

        self.assertEqual(root, leaf)
        self.assertEqual(proofs[leaf], [])
        self.assertTrue(verify_sorted_proof(leaf, proofs[leaf], root))

    def test_all_voter_proofs_reconstruct_the_sorted_pair_root(self):
        leaves = [Web3.keccak(text=f'voter-{number}') for number in range(5)]
        root, proofs = build_merkle_tree(leaves)

        self.assertEqual(set(proofs), set(leaves))
        for leaf in leaves:
            self.assertTrue(verify_sorted_proof(leaf, proofs[leaf], root))

    def test_duplicate_leaves_are_removed(self):
        leaf = Web3.keccak(text='same-voter')
        root, proofs = build_merkle_tree([leaf, leaf])

        self.assertEqual(root, leaf)
        self.assertEqual(len(proofs), 1)
