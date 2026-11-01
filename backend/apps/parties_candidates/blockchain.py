from web3 import Web3
from web3.logs import DISCARD

from apps.receipts.blockchain import get_web3, load_contract_config


def get_verified_candidate_registration(tx_hash):
    w3 = get_web3()
    if not w3.is_connected():
        raise ConnectionError('Configured blockchain RPC is unavailable.')
    config = load_contract_config()['LightVote']
    tx = w3.eth.get_transaction(tx_hash)
    receipt = w3.eth.get_transaction_receipt(tx_hash)
    if receipt['status'] != 1:
        raise ValueError('Candidate registration transaction reverted.')
    if not tx.get('to') or tx['to'].lower() != config['address'].lower():
        raise ValueError('Transaction was not sent to the configured LightVote contract.')

    contract = w3.eth.contract(address=Web3.to_checksum_address(config['address']), abi=config['abi'])
    function, call = contract.decode_function_input(tx['input'])
    if function.fn_name != 'registerCandidate':
        raise ValueError('Transaction was not a candidate registration.')
    events = contract.events.CandidateRegistered().process_receipt(receipt, errors=DISCARD)
    if len(events) != 1:
        raise ValueError('Transaction did not emit exactly one CandidateRegistered event.')
    args = events[0]['args']
    return {
        'candidate_id': int(args['candidateId']),
        'election_id': int(args['electionId']),
        'constituency_id': int(args['constituencyId']),
        'name': args['name'],
        'party_abbreviation': args['party'],
        'candidate_ref': Web3.to_hex(call['candidateRef']),
        'district_id': int(call['districtId']),
        'tx_hash': tx['hash'].hex(),
    }
