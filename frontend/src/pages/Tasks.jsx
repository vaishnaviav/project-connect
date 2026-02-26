import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckSquare, Clock, AlertCircle } from 'lucide-react';
import { taskAPI, groupAPI } from '../utils/api';
import toast from 'react-hot-toast';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    group: '',
  });

  useEffect(() => {
    fetchData();
  }, [selectedGroup]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, groupsRes] = await Promise.all([
        taskAPI.getMyTasks(),
        groupAPI.getMyGroups(),
      ]);
      setTasks(tasksRes.data.data || []);
      setGroups(groupsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await taskAPI.createTask(newTask);
      toast.success('Task created!');
      setShowCreateModal(false);
      fetchData();
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        group: '',
      });
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await taskAPI.updateTask(taskId, { status: newStatus });
      toast.success('Status updated!');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const columns = [
    { id: 'pending', title: 'To Do', color: 'bg-gray-600' },
    { id: 'in-progress', title: 'In Progress', color: 'bg-blue-600' },
    { id: 'review', title: 'Review', color: 'bg-yellow-600' },
    { id: 'completed', title: 'Done', color: 'bg-green-600' },
  ];

  const TaskCard = ({ task }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 mb-3 cursor-move"
    >
      <h3 className="font-semibold mb-2">{task.title}</h3>
      {task.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex items-center justify-between">
        <span className={`badge ${
          task.priority === 'high' ? 'badge-danger' :
          task.priority === 'medium' ? 'badge-warning' :
          'badge-primary'
        }`}>
          {task.priority}
        </span>
        
        {task.dueDate && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      <select
        value={task.status}
        onChange={(e) => handleUpdateStatus(task._id, e.target.value)}
        className="input-field text-xs mt-3"
      >
        <option value="pending">To Do</option>
        <option value="in-progress">In Progress</option>
        <option value="review">Review</option>
        <option value="completed">Done</option>
      </select>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2 gradient-text">Tasks</h1>
          <p className="text-gray-400">Manage your project tasks</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Task
        </button>
      </div>

      <div className="glass-card p-4 mb-6">
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="input-field"
        >
          <option value="all">All Groups</option>
          {groups.map((group) => (
            <option key={group._id} value={group._id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((column) => (
          <div key={column.id} className="space-y-4">
            <div className={`${column.color} text-white px-4 py-2 rounded-lg flex items-center justify-between`}>
              <span className="font-semibold">{column.title}</span>
              <span className="badge bg-white/20">
                {tasks.filter(t => t.status === column.id).length}
              </span>
            </div>
            
            <div className="space-y-3">
              {tasks
                .filter(t => t.status === column.id)
                .map(task => (
                  <TaskCard key={task._id} task={task} />
                ))}
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="glass-card p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-display font-bold mb-4">Create Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="input-field min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Group</label>
                <select
                  value={newTask.group}
                  onChange={(e) => setNewTask({ ...newTask, group: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Select Group</option>
                  {groups.map((group) => (
                    <option key={group._id} value={group._id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="input-field"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;