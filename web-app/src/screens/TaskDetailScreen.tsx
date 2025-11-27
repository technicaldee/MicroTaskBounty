import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { claimTask } from '../store/slices/taskSlice';
import { blockchainService } from '../services/blockchain';
import './Screen.css';

export default function TaskDetailScreen() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { claimedTasks } = useSelector((state: RootState) => state.tasks);
  const { address } = useSelector((state: RootState) => state.wallet);
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (taskId) {
      loadTask(Number(taskId));
    }
  }, [taskId]);

  const loadTask = async (id: number) => {
    try {
      const taskManager = blockchainService.getTaskManager();
      const taskData = await taskManager.getTask(id);
      setTask({
        id: Number(taskData.id),
        description: taskData.description,
        bountyAmount: taskData.bountyAmount.toString(),
        deadline: Number(taskData.deadline),
        category: taskData.category,
        status: taskData.status,
      });
    } catch (error) {
      console.error('Failed to load task:', error);
      alert('Failed to load task. Make sure contracts are deployed and addresses are set.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!address) {
      alert('Please connect your wallet first');
      navigate('/wallet');
      return;
    }

    // Fetch real active tasks from blockchain
    try {
      const realActiveTasks = await blockchainService.getWorkerActiveTasks(address);
      if (realActiveTasks.length >= 3) {
        alert('You can only have 3 active tasks at a time');
        return;
      }
    } catch (error) {
      console.error('Failed to check active tasks:', error);
    }

    if (!taskId) return;

    setClaiming(true);
    try {
      await dispatch(claimTask(Number(taskId))).unwrap();
      alert('Task claimed successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to claim task');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="screen">
        <div className="loading">Loading task details...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="screen">
        <p>Task not found</p>
        <button onClick={() => navigate('/')}>Back to Tasks</button>
      </div>
    );
  }

  const isClaimed = taskId ? claimedTasks.includes(Number(taskId)) : false;
  const deadlineDate = new Date(task.deadline * 1000);
  const bountyAmount = parseFloat(task.bountyAmount) / 1e18;

  return (
    <div className="screen">
      <button className="back-button" onClick={() => navigate('/')}>
        ← Back
      </button>

      <h1>{task.description}</h1>

      <div className="detail-section">
        <label className="detail-label">Bounty</label>
        <p className="detail-value">{bountyAmount.toFixed(2)} cUSD</p>
      </div>

      <div className="detail-section">
        <label className="detail-label">Deadline</label>
        <p className="detail-value">{deadlineDate.toLocaleString()}</p>
      </div>

      <div className="detail-section">
        <label className="detail-label">Category</label>
        <p className="detail-value">Category {task.category}</p>
      </div>

      {!isClaimed ? (
        <button
          className="claim-button"
          onClick={handleClaim}
          disabled={claiming}
        >
          {claiming ? 'Claiming...' : 'Claim Task'}
        </button>
      ) : (
        <div className="claimed-badge">
          <span>Task Claimed</span>
        </div>
      )}
    </div>
  );
}
