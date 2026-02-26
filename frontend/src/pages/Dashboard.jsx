import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, 
  MessageSquare, 
  CheckCircle, 
  TrendingUp,
  Plus,
  UserPlus,
  ArrowRight,
  Star,
  Clock
} from 'lucide-react';
import { groupAPI, matchAPI, userAPI, messageAPI, taskAPI } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    groupCount: 0,
    messageCount: 0,
    taskCount: 0,
    reputation: 0,
  });
  const [myGroups, setMyGroups] = useState([]);
  const [recommendedPartners, setRecommendedPartners] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [groupsRes, partnersRes, messagesRes, tasksRes] = await Promise.all([
        groupAPI.getMyGroups(),
        matchAPI.findPartners(4),
        messageAPI.getUnreadCount(),
        taskAPI.getMyTasks({ limit: 5 }),
      ]);

      setMyGroups(groupsRes.data.data || []);
      setRecommendedPartners(partnersRes.data.data || []);
      
      setStats({
        groupCount: groupsRes.data.count || 0,
        messageCount: messagesRes.data.unreadCount || 0,
        taskCount: tasksRes.data.count || 0,
        reputation: user?.reputationScore || 0,
      });

      // Recent activity from tasks
      setRecentActivity(tasksRes.data.data || []);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon, label, value, color, link }) => (
    <Link to={link}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        className="glass-card p-6 cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg ${color}`}>
            {icon}
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-400 transition-colors" />
        </div>
        <h3 className="text-3xl font-bold mb-1">{value}</h3>
        <p className="text-gray-400 text-sm">{label}</p>
      </motion.div>
    </Link>
  );

  const GroupCard = ({ group }) => (
    <Link to={`/groups/${group._id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card-hover p-5"
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-lg">{group.name}</h3>
          <span className={`badge ${
            group.status === 'active' ? 'badge-success' : 'badge-warning'
          }`}>
            {group.status}
          </span>
        </div>
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
          {group.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Users className="w-4 h-4" />
            {group.members?.length || 0}/{group.maxMembers} members
          </div>
          <span className="badge-primary">
            {group.projectType}
          </span>
        </div>
      </motion.div>
    </Link>
  );

  const PartnerCard = ({ user, matchScore }) => (
    <Link to={`/profile/${user._id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card-hover p-5"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-full flex items-center justify-center text-white font-semibold text-lg">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{user.name}</h3>
            <p className="text-sm text-gray-400">{user.department || 'Student'}</p>
          </div>
          {matchScore && (
            <span className="badge-success">{matchScore}%</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {user.skills?.slice(0, 3).map((skill) => (
            <span key={skill.name} className="skill-chip text-xs">
              {skill.name}
            </span>
          ))}
        </div>
      </motion.div>
    </Link>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-display font-bold mb-2">
          Welcome back, <span className="gradient-text">{user?.name}!</span>
        </h1>
        <p className="text-gray-400">Here's what's happening with your projects</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-6 h-6 text-primary-400" />}
          label="My Groups"
          value={stats.groupCount}
          color="bg-primary-600/20"
          link="/groups"
        />
        <StatCard
          icon={<MessageSquare className="w-6 h-6 text-accent-cyan" />}
          label="Unread Messages"
          value={stats.messageCount}
          color="bg-accent-cyan/20"
          link="/messages"
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6 text-green-400" />}
          label="Active Tasks"
          value={stats.taskCount}
          color="bg-green-600/20"
          link="/tasks"
        />
        <StatCard
          icon={<Star className="w-6 h-6 text-yellow-400" />}
          label="Reputation"
          value={stats.reputation.toFixed(1)}
          color="bg-yellow-600/20"
          link="/profile"
        />
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-4"
      >
        <Link to="/groups?create=true" className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Group
        </Link>
        <Link to="/find-partners" className="btn-outline flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Find Partners
        </Link>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* My Groups */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold">My Groups</h2>
            <Link to="/groups" className="text-primary-400 hover:text-primary-300 text-sm font-medium">
              View All →
            </Link>
          </div>
          <div className="space-y-4">
            {myGroups.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">You're not in any groups yet</p>
                <Link to="/groups" className="btn-primary inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Join a Group
                </Link>
              </div>
            ) : (
              myGroups.slice(0, 3).map((group) => (
                <GroupCard key={group._id} group={group} />
              ))
            )}
          </div>
        </motion.div>

        {/* Recommended Partners */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold">Recommended Partners</h2>
            <Link to="/find-partners" className="text-primary-400 hover:text-primary-300 text-sm font-medium">
              See More →
            </Link>
          </div>
          <div className="space-y-4">
            {recommendedPartners.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <UserPlus className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No recommendations yet</p>
                <p className="text-sm text-gray-500">
                  Update your skills and interests to get matched
                </p>
              </div>
            ) : (
              recommendedPartners.map((partner) => (
                <PartnerCard
                  key={partner.user._id}
                  user={partner.user}
                  matchScore={partner.matchScore}
                />
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-2xl font-display font-bold mb-6">Recent Activity</h2>
          <div className="glass-card divide-y divide-dark-700">
            {recentActivity.map((task) => (
              <div key={task._id} className="p-4 hover:bg-dark-700/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <Link to={`/tasks?id=${task._id}`} className="font-medium hover:text-primary-400">
                        {task.title}
                      </Link>
                      <p className="text-sm text-gray-400 mt-1">
                        {task.group?.name || 'Personal Task'}
                      </p>
                    </div>
                  </div>
                  <span className={`badge ${
                    task.status === 'completed' ? 'badge-success' :
                    task.status === 'in-progress' ? 'badge-warning' :
                    'badge-primary'
                  }`}>
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;