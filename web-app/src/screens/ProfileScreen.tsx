import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchReputation, fetchActiveTasks } from '../store/slices/userSlice';
import './Screen.css';

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { address } = useSelector((state: RootState) => state.wallet);
  const { reputation, tasksCompleted, tasksRejected, totalEarnings, badges, activeTasks, loading } = useSelector(
    (state: RootState) => state.user
  );

  useEffect(() => {
    if (address) {
      dispatch(fetchReputation(address));
      dispatch(fetchActiveTasks(address));
    }
  }, [address, dispatch]);

  const successRate =
    tasksCompleted + tasksRejected > 0
      ? ((tasksCompleted / (tasksCompleted + tasksRejected)) * 100).toFixed(1)
      : '0';

  if (loading) {
    return (
      <div className="screen">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  const categories = ['Photo Verification', 'Location Check', 'Survey', 'Price Monitoring', 'Business Hours'];

  return (
    <div className="screen">
      <div className="reputation-card">
        <label className="reputation-label">Reputation Score</label>
        <p className="reputation-value">{reputation}</p>
        <div className="reputation-bar">
          <div
            className="reputation-fill"
            style={{ width: `${reputation}%` }}
          />
        </div>
      </div>

      <div className="stats-section">
        <div className="stat-card">
          <p className="stat-value">{tasksCompleted}</p>
          <label className="stat-label">Tasks Completed</label>
        </div>
        <div className="stat-card">
          <p className="stat-value">{successRate}%</p>
          <label className="stat-label">Success Rate</label>
        </div>
        <div className="stat-card">
          <p className="stat-value">{totalEarnings}</p>
          <label className="stat-label">Total Earnings</label>
        </div>
        <div className="stat-card">
          <p className="stat-value">{activeTasks.length}</p>
          <label className="stat-label">Active Tasks</label>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="detail-section">
          <label className="detail-label">Badges Earned</label>
          <div className="badges-list">
            {badges.map((badgeId) => (
              <span key={badgeId} className="badge">
                {categories[badgeId]}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="detail-section">
        <label className="detail-label">Account</label>
        <p className="address-text">{address || 'Not connected'}</p>
      </div>
    </div>
  );
}
