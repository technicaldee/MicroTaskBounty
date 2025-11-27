import React from 'react';
import { Task } from '../store/slices/taskSlice';
import './TaskCard.css';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const bountyAmount = parseFloat(task.bountyAmount) / 1e18; // Convert from wei
  const deadlineDate = new Date(Number(task.deadline) * 1000);
  const timeRemaining = deadlineDate.getTime() - Date.now();
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));

  return (
    <div className="task-card" onClick={onClick}>
      <p className="task-description">{task.description}</p>
      
      <div className="task-row">
        <div className="task-bounty">
          <span className="bounty-amount">{bountyAmount.toFixed(2)} cUSD</span>
        </div>
        
        <div className="task-deadline">
          <span className="deadline-text">
            {hoursRemaining > 0 ? `${hoursRemaining}h left` : 'Expired'}
          </span>
        </div>
      </div>

      {task.distance !== undefined && (
        <p className="task-distance">{task.distance.toFixed(0)}m away</p>
      )}
    </div>
  );
}
