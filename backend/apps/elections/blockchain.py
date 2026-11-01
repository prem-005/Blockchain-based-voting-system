from web3 import Web3
from web3.logs import DISCARD

from apps.receipts.blockchain import get_web3, load_contract_config
from django.conf import settings


def verify_election_creation(tx_hash, election_data):
    w3 = get_web3()
    if not w3.is_connected():
        raise ConnectionError('Configured blockchain RPC is unavailable.')
    if int(w3.eth.chain_id) != int(settings.CHAIN_ID):
        raise ValueError('Connected chain ID does not match the configured deployment chain.')
    config = load_contract_config()['ElectionManager']
    tx = w3.eth.get_transaction(tx_hash)
    receipt = w3.eth.get_transaction_receipt(tx_hash)
    if receipt['status'] != 1 or not tx.get('to') or tx['to'].lower() != config['address'].lower():
        raise ValueError('Election creation transaction did not confirm on ElectionManager.')
    manager = w3.eth.contract(address=Web3.to_checksum_address(config['address']), abi=config['abi'])
    function, args = manager.decode_function_input(tx['input'])
    expected = election_data
    if function.fn_name != 'createElection':
        raise ValueError('Transaction was not an election creation.')
    if (int(args['electionId']) != int(expected['id']) or args['name'] != expected['name'] or
            int(args['year']) != int(expected['year']) or args['state'] != expected['state_name'] or
            int(args['startTime']) != int(expected['start_time'].timestamp()) or
            int(args['endTime']) != int(expected['end_time'].timestamp())):
        raise ValueError('Election API fields do not match the confirmed chain transaction.')
    events = manager.events.ElectionCreated().process_receipt(receipt, errors=DISCARD)
    if len(events) != 1 or int(events[0]['args']['electionId']) != int(expected['id']):
        raise ValueError('ElectionCreated event is missing or does not match the requested election.')
    return tx['hash'].hex()


def verify_election_status_action(tx_hash, action, election_id):
    w3 = get_web3()
    if not w3.is_connected():
        raise ConnectionError('Configured blockchain RPC is unavailable.')
    if int(w3.eth.chain_id) != int(settings.CHAIN_ID):
        raise ValueError('Connected chain ID does not match the configured deployment chain.')
    config = load_contract_config()
    manager_config = config['ElectionManager']
    tx = w3.eth.get_transaction(tx_hash)
    receipt = w3.eth.get_transaction_receipt(tx_hash)
    if receipt['status'] != 1:
        raise ValueError('Election status transaction reverted.')
    expected_contract = config['ElectionResults']['address'] if action == 'PUBLISH_RESULTS' else manager_config['address']
    if not tx.get('to') or tx['to'].lower() != expected_contract.lower():
        raise ValueError('Transaction was sent to the wrong contract for this election action.')

    abi = config['ElectionResults']['abi'] if action == 'PUBLISH_RESULTS' else manager_config['abi']
    target = w3.eth.contract(address=Web3.to_checksum_address(expected_contract), abi=abi)
    function, args = target.decode_function_input(tx['input'])
    method_for_action = {
        'START': 'startElection',
        'STOP': 'stopElection',
        'PUBLISH_RESULTS': 'publishResults',
        'ARCHIVE': 'archiveElection',
        'CANCEL': 'cancelElection',
    }
    if function.fn_name != method_for_action[action] or int(args['electionId']) != int(election_id):
        raise ValueError('Transaction calldata does not match the requested election action.')

    manager = w3.eth.contract(address=Web3.to_checksum_address(manager_config['address']), abi=manager_config['abi'])
    election = manager.functions.elections(int(election_id)).call()
    expected_status = {'START': 1, 'STOP': 2, 'PUBLISH_RESULTS': 3, 'ARCHIVE': 4, 'CANCEL': 5}[action]
    if int(election[6]) != expected_status:
        raise ValueError('Current on-chain election state does not match the requested transition.')
    return tx['hash'].hex()
