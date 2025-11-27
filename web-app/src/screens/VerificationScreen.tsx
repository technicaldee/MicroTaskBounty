import './Screen.css';

export default function VerificationScreen() {
  return (
    <div className="screen">
      <h1>Verification Queue</h1>
      <p>Review and verify task submissions to earn rewards</p>
      <div className="empty-state">
        <p className="empty-text">No pending verifications</p>
        <p className="empty-subtext">
          When tasks are submitted, they will appear here for verification
        </p>
      </div>
    </div>
  );
}
