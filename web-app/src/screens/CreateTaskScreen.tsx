import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { createTask } from '../store/slices/taskSlice';
import { locationService } from '../services/location';
import './Screen.css';

export default function CreateTaskScreen() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { address, connected } = useSelector((state: RootState) => state.wallet);
  
  const [formData, setFormData] = useState({
    description: '',
    category: '0',
    bountyAmount: '0.5',
    currency: 'CELO', // 'CELO' or 'cUSD'
    maxWorkers: '5',
    latitude: '',
    longitude: '',
    radius: '100',
    deadline: '',
    photoCount: '1',
    requiresLocation: true,
    minReputation: '0',
    requiredBadge: '0',
  });
  
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!connected) {
      navigate('/wallet');
    }
  }, [connected, navigate]);

  const handleGetLocation = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      setFormData({
        ...formData,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
      });
      setUseCurrentLocation(true);
    } catch (error: any) {
      alert('Failed to get location: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    if (parseFloat(formData.bountyAmount) < 0.5) {
      alert('Minimum bounty is 0.5 cUSD');
      return;
    }

    const deadline = new Date(formData.deadline).getTime() / 1000;
    if (deadline <= Date.now() / 1000) {
      alert('Deadline must be in the future');
      return;
    }

    setCreating(true);
    try {
      const result = await dispatch(createTask({
        description: formData.description,
        category: parseInt(formData.category),
        bountyAmount: formData.bountyAmount,
        currency: formData.currency as 'CELO' | 'cUSD',
        maxWorkers: parseInt(formData.maxWorkers),
        location: {
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          radius: parseInt(formData.radius),
        },
        deadline: deadline,
        requirements: {
          photoCount: parseInt(formData.photoCount),
          requiresLocation: formData.requiresLocation,
          minReputation: parseInt(formData.minReputation),
          requiredBadge: parseInt(formData.requiredBadge),
        },
      })).unwrap();

      alert(`Task created successfully! Task ID: ${result.taskId}`);
      navigate('/');
    } catch (error: any) {
      // Provide more helpful error messages
      let errorMessage = 'Failed to create task';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.includes?.('insufficient funds')) {
        errorMessage = 'Insufficient funds. You need enough CELO to cover the bounty amount plus gas fees. Please add funds to your wallet.';
      }
      
      alert(errorMessage);
      console.error('Task creation error:', error);
    } finally {
      setCreating(false);
    }
  };

  const categories = [
    'Photo Verification',
    'Location Check',
    'Survey',
    'Price Monitoring',
    'Business Hours',
  ];

  // Set default deadline to 24 hours from now
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormData({
      ...formData,
      deadline: tomorrow.toISOString().slice(0, 16),
    });
  }, []);

  return (
    <div className="screen">
      <button className="back-button" onClick={() => navigate('/')}>
        ← Back
      </button>
      
      <h1>Create New Task</h1>
      <p className="subtitle">Create a task and set a bounty for workers to complete it</p>

      <form onSubmit={handleSubmit} className="task-form">
        <div className="form-group">
          <label className="form-label">Task Description *</label>
          <textarea
            className="form-input"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe what workers need to do..."
            required
            rows={4}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Category *</label>
          <select
            className="form-input"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
          >
            {categories.map((cat, idx) => (
              <option key={idx} value={idx}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Bounty Amount *</label>
            <input
              type="number"
              className="form-input"
              value={formData.bountyAmount}
              onChange={(e) => setFormData({ ...formData, bountyAmount: e.target.value })}
              min="0.5"
              step="0.1"
              required
            />
            <small>Minimum: 0.5 {formData.currency}</small>
          </div>

          <div className="form-group">
            <label className="form-label">Currency *</label>
            <select
              className="form-input"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              required
            >
              <option value="CELO">CELO</option>
              <option value="cUSD">cUSD</option>
            </select>
            <small>Choose payment currency</small>
          </div>

          <div className="form-group">
            <label className="form-label">Max Workers *</label>
            <input
              type="number"
              className="form-input"
              value={formData.maxWorkers}
              onChange={(e) => setFormData({ ...formData, maxWorkers: e.target.value })}
              min="1"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Deadline *</label>
          <input
            type="datetime-local"
            className="form-input"
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Location</label>
          <div className="location-group">
            <div className="location-inputs">
              <input
                type="number"
                className="form-input"
                placeholder="Latitude"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                step="any"
                required
              />
              <input
                type="number"
                className="form-input"
                placeholder="Longitude"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                step="any"
                required
              />
              <input
                type="number"
                className="form-input"
                placeholder="Radius (meters)"
                value={formData.radius}
                onChange={(e) => setFormData({ ...formData, radius: e.target.value })}
                min="10"
                required
              />
            </div>
            <button
              type="button"
              className="location-button"
              onClick={handleGetLocation}
            >
              Use Current Location
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Requirements</label>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Photo Count</label>
              <input
                type="number"
                className="form-input"
                value={formData.photoCount}
                onChange={(e) => setFormData({ ...formData, photoCount: e.target.value })}
                min="0"
                max="10"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Min Reputation</label>
              <input
                type="number"
                className="form-input"
                value={formData.minReputation}
                onChange={(e) => setFormData({ ...formData, minReputation: e.target.value })}
                min="0"
                max="100"
              />
            </div>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.requiresLocation}
              onChange={(e) => setFormData({ ...formData, requiresLocation: e.target.checked })}
            />
            Require location verification
          </label>
        </div>

        <button
          type="submit"
          className="claim-button"
          disabled={creating}
        >
          {creating ? 'Creating Task...' : `Create Task (${formData.bountyAmount} ${formData.currency})`}
        </button>
      </form>
    </div>
  );
}


