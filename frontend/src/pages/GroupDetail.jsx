import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  MessageCircle,
  CheckSquare,
  Settings,
  UserPlus,
  LogOut,
  Shield,
  Clock,
  Calendar
} from 'lucide-react';
import { groupAPI, taskAPI } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinMessage, setJoinMessage] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    fetchGroupDetails();
  }, [id]);

  const fetchGroupDetails = async () => {
    try {
      const response = await groupAPI.getGroup(id);
      setGroup(response.data.data);
    } catch (error) {
      toast.error('Failed to load group details');
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async () => {
    try {
      await groupAPI.requestJoin(id, joinMessage);
      toast.success('Join request sent!');
      setShowJoinModal(false);
      fetchGroupDetails();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send request');
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    
    try {
      await groupAPI.leaveGroup(id);
      toast.success('Left group successfully');
      navigate('/groups');
    } catch (error) {
      toast.error('Failed to leave group');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="loader"></div>
      </div>
    );
  }

  if (!group) return null;

  const isMember = group.members?.some(m => 
    (m.user?._id || m.user) === user?._id
  );
  const isLeader = group.creator === user?._id || group.creator?._id === user?._id;
  const hasPendingRequest = group.joinRequests?.some(r => r.user === user?._id);

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-4xl font-display font-bold gradient-text">
                {group.name}
              </h1>
              {isLeader && (
                <span className="badge-warning">Leader</span>
              )}
            </div>
            <p className="text-gray-300 text-lg mb-4">{group.description}</p>
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {group.members?.length}/{group.maxMembers} members
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Created {new Date(group.createdAt).toLocaleDateString()}
              </div>
              <span className="badge-primary">{group.projectType}</span>
              <span className={`badge ${
                group.status === 'active' ? 'badge-success' :
                group.status === 'recruiting' ? 'badge-warning' :
                'badge-primary'
              }`}>
                {group.status}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {!isMember && !hasPendingRequest && (
              <button
                onClick={() => setShowJoinModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Request to Join
              </button>
            )}
            {hasPendingRequest && (
              <button disabled className="btn-secondary cursor-not-allowed">
                Request Pending
              </button>
            )}
            {isMember && (
              <>
                <Link to={`/messages?group=${id}`} className="btn-primary flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Chat
                </Link>
                <Link to={`/tasks?group=${id}`} className="btn-outline flex items-center gap-2">
                  <CheckSquare className="w-5 h-5" />
                  Tasks
                </Link>
                <button
                  onClick={handleLeaveGroup}
                  className="btn-secondary flex items-center gap-2 text-red-400 hover:text-red-300"
                >
                  <LogOut className="w-5 h-5" />
                  Leave
                </button>
              </>
            )}
            {isLeader && (
              <Link to={`/groups/${id}/settings`} className="btn-outline flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Settings
              </Link>
            )}
          </div>
        </div>

        {/* Required Skills */}
        {group.requiredSkills && group.requiredSkills.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {group.requiredSkills.map((skill, index) => (
                <span key={index} className="skill-chip">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {group.tags && group.tags.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {group.tags.map((tag, index) => (
                <span key={index} className="badge-primary">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Members */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 mb-8"
      >
        <h2 className="text-2xl font-display font-bold mb-6">Members</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {group.members?.map((member) => {
            const memberUser = member.user?.name ? member.user : { name: 'Unknown', _id: member.user };
            return (
              <div key={memberUser._id} className="glass-card-hover p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-full flex items-center justify-center text-white font-semibold">
                  {memberUser.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <Link
                    to={`/profile/${memberUser._id}`}
                    className="font-semibold hover:text-primary-400"
                  >
                    {memberUser.name}
                  </Link>
                  <p className="text-sm text-gray-400 capitalize">{member.role}</p>
                </div>
                {member.role === 'leader' && (
                  <Shield className="w-5 h-5 text-yellow-400" />
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Join Request Modal */}
      {showJoinModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowJoinModal(false)}
        >
          <div
            className="glass-card p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-display font-bold mb-4">Request to Join</h2>
            <p className="text-gray-400 mb-4">
              Tell the group leader why you want to join this project
            </p>
            <textarea
              value={joinMessage}
              onChange={(e) => setJoinMessage(e.target.value)}
              className="input-field min-h-[120px] mb-4"
              placeholder="I'm interested in joining because..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button onClick={handleJoinRequest} className="btn-primary flex-1">
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetail;