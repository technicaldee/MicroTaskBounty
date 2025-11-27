import { useState } from 'react';
import { blockchainService } from '../services/blockchain';
import './ContractConfig.css';

export default function ContractConfig() {
  const [addresses, setAddresses] = useState({
    taskManager: '',
    bountyPool: '',
    reputationContract: '',
    verificationContract: '',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    blockchainService.setAddresses(addresses);
    blockchainService.loadContracts().then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }).catch((error) => {
      alert('Failed to load contracts: ' + error.message);
    });
  };

  return (
    <div className="contract-config">
      <h3>Contract Configuration</h3>
      <p className="config-help">
        Enter contract addresses after deployment. Or deploy contracts and they will be loaded automatically.
      </p>
      <div className="config-inputs">
        <div className="config-group">
          <label>TaskManager</label>
          <input
            type="text"
            value={addresses.taskManager}
            onChange={(e) => setAddresses({ ...addresses, taskManager: e.target.value })}
            placeholder="0x..."
          />
        </div>
        <div className="config-group">
          <label>BountyPool</label>
          <input
            type="text"
            value={addresses.bountyPool}
            onChange={(e) => setAddresses({ ...addresses, bountyPool: e.target.value })}
            placeholder="0x..."
          />
        </div>
        <div className="config-group">
          <label>ReputationContract</label>
          <input
            type="text"
            value={addresses.reputationContract}
            onChange={(e) => setAddresses({ ...addresses, reputationContract: e.target.value })}
            placeholder="0x..."
          />
        </div>
        <div className="config-group">
          <label>VerificationContract</label>
          <input
            type="text"
            value={addresses.verificationContract}
            onChange={(e) => setAddresses({ ...addresses, verificationContract: e.target.value })}
            placeholder="0x..."
          />
        </div>
      </div>
      <button onClick={handleSave} className="config-button">
        {saved ? '✓ Saved!' : 'Save Addresses'}
      </button>
    </div>
  );
}




