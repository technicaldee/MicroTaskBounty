import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchTasks } from '../store/slices/taskSlice';
import TaskCard from '../components/TaskCard';
import './Screen.css';

export default function TaskFeedScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { tasks, loading } = useSelector((state: RootState) => state.tasks);

  useEffect(() => {
    // Fetch tasks from blockchain
    dispatch(fetchTasks());
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(() => {
      dispatch(fetchTasks());
    }, 30000);
    
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleTaskClick = (taskId: number) => {
    navigate(`/task/${taskId}`);
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>Available Tasks</h1>
        <Link to="/create-task" className="create-button">
          + Create Task
        </Link>
      </div>
      
      {loading ? (
        <div className="loading">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <p className="empty-text">No tasks available</p>
          <p className="empty-subtext">Check back later for new tasks</p>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => handleTaskClick(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
