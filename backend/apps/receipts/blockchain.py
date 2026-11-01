import json
from functools import lru_cache

from django.conf import settings
from web3 import Web3
from web3.logs import DISCARD


@lru_cache(maxsize=1)
def load_contract_config():
    with open(settings.BASE_DIR / 'contracts_meta' / 'contracts.json', encoding='utf-8') as contract_file:
        return json.load(contract_file)


def get_web3():
    return Web3(Web3.HTTPProvider(settings.HARDHAT_RPC_URL, request_kwargs={'timeout': 5}))


def get_verified_vote_transaction(tx_hash):
    """Return chain-derived receipt/event data only for a successful LightVote transaction."""
    w3 = get_web3()
    if not w3.is_connected():
        raise ConnectionError('Configured blockchain RPC is unavailable.')

    config = load_contract_config()
    light_vote_config = config.get('LightVote') or {}
    address = light_vote_config.get('address')
    abi = light_vote_config.get('abi')
    if not address or not abi:
        raise RuntimeError('LightVote contract deployment configuration is missing.')

    try:
        transaction = w3.eth.get_transaction(tx_hash)
        chain_receipt = w3.eth.get_transaction_receipt(tx_hash)
    except Exception as error:
        raise LookupError('Transaction is not present on the configured chain.') from error

    if chain_receipt['status'] != 1:
        raise ValueError('The blockchain transaction reverted.')
    if not transaction.get('to') or transaction['to'].lower() != address.lower():
        raise ValueError('Transaction was not sent to the configured LightVote contract.')

    contract = w3.eth.contract(address=Web3.to_checksum_address(address), abi=abi)
    function, call_args = contract.decode_function_input(transaction['input'])
    if function.fn_name != 'castVote':
        raise ValueError('Transaction was not a vote submission.')
    vote_event = contract.events.VoteRecorded()
    events = vote_event.process_receipt(chain_receipt, errors=DISCARD)
    if len(events) != 1:
        raise ValueError('Transaction did not emit exactly one VoteRecorded event.')

    event = events[0]['args']
    block = w3.eth.get_block(chain_receipt['blockNumber'])
    return {
        'tx_hash': transaction['hash'].hex(),
        'transaction': transaction,
        'receipt': chain_receipt,
        'block': block,
        'election_id': int(event['electionId']),
        'constituency_id': int(event['constituencyId']),
        'nullifier_hash': Web3.to_hex(event['nullifierHash']),
        'candidate_id': int(call_args['candidateId']),
        'call_election_id': int(call_args['electionId']),
        'call_constituency_id': int(call_args['constituencyId']),
        'call_nullifier_hash': Web3.to_hex(call_args['nullifierHash']),
        'block_number': int(chain_receipt['blockNumber']),
        'block_hash': Web3.to_hex(chain_receipt['blockHash']),
        'gas_used': int(chain_receipt['gasUsed']),
        'timestamp': int(block['timestamp']),
        'contract_address': address,
        'logs_count': len(chain_receipt['logs']),
    }
