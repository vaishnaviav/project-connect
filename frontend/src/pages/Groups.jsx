import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Users, 
  Filter,
  X,
  Lock,
  Globe,
  TrendingUp
} from 'lucide-react';
import { groupAPI } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const Groups = () => {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    projectType: '',
    status: '',
    isPrivate: '',
  });

  // Form state for creating group
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    projectType: 'web-development',
    maxMembers: 5,
    isPrivate: false,
    requiresApproval: true,
    requiredSkills: [],
    tags: [],
  });
  const [skillInput, setSkillInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    // Check if create modal should be open
    if (searchParams.get('create') === 'true') {
      setShowCreateModal(true);
    }
    fetchGroups();
  }, [filters, searchParams]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (filters.projectType) params.projectType = filters.projectType;
      if (filters.status) params.status = filters.status;
      if (filters.isPrivate !== '') params.isPrivate = filters.isPrivate;

      const response = await groupAPI.getGroups(params);
      setGroups(response.data.data || []);
    } catch (error) {
      console.error('Fetch groups error:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchGroups();
      return;
    }
    
    setLoading(true);
    try {
      const response = await groupAPI.searchGroups(searchQuery);
      setGroups(response.data.data || []);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const response = await groupAPI.createGroup(newGroup);
      toast.success('Group created successfully!');
      setShowCreateModal(false);
      setGroups([response.data.data, ...groups]);
      // Reset form
      setNewGroup({
        name: '',
        description: '',
        projectType: 'web-development',
        maxMembers: 5,
        isPrivate: false,
        requiresApproval: true,
        requiredSkills: [],
        tags: [],
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create group');
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !newGroup.requiredSkills.includes(skillInput.trim())) {
      setNewGroup({
        ...newGroup,
        requiredSkills: [...newGroup.requiredSkills, skillInput.trim()]
      });
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setNewGroup({
      ...newGroup,
      requiredSkills: newGroup.requiredSkills.filter(s => s !== skill)
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !newGroup.tags.includes(tagInput.trim())) {
      setNewGroup({
        ...newGroup,
        tags: [...newGroup.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setNewGroup({
      ...newGroup,
      tags: newGroup.tags.filter(t => t !== tag)
    });
  };

  const GroupCard = ({ group }) => {
    const isMember = group.members?.some(m => m.user === user?._id || m.user?._id === user?._id);
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card-hover p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-semibold">{group.name}</h3>
              {group.isPrivate ? (
                <Lock className="w-4 h-4 text-yellow-400" />
              ) : (
                <Globe className="w-4 h-4 text-green-400" />
              )}
            </div>
            <p className="text-gray-400 text-sm line-clamp-2">{group.description}</p>
          </div>
        </div>

        {/* Skills */}
        {group.requiredSkills && group.requiredSkills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {group.requiredSkills.slice(0, 4).map((skill, index) => (
              <span key={index} className="skill-chip text-xs">
                {skill}
              </span>
            ))}
            {group.requiredSkills.length > 4 && (
              <span className="text-xs text-gray-400">
                +{group.requiredSkills.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {group.members?.length || 0}/{group.maxMembers}
            </div>
            <span className="badge-primary text-xs">
              {group.projectType}
            </span>
          </div>
          <span className={`badge ${
            group.status === 'active' ? 'badge-success' :
            group.status === 'recruiting' ? 'badge-warning' :
            'badge-primary'
          }`}>
            {group.status}
          </span>
        </div>

        {/* Action Button */}
        <Link to={`/groups/${group._id}`} className="btn-primary w-full text-center">
          {isMember ? 'View Group' : 'View Details'}
        </Link>
      </motion.div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2 gradient-text">
            Discover Groups
          </h1>
          <p className="text-gray-400">Find and join project groups that match your interests</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Create Group
        </button>
      </div>

      {/* Search and Filters */}
      <div className="glass-card p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search groups..."
              className="input-field pl-11 w-full"
            />
          </div>
          <button onClick={handleSearch} className="btn-primary">
            Search
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <select
            value={filters.projectType}
            onChange={(e) => setFilters({ ...filters, projectType: e.target.value })}
            className="input-field"
          >
            <option value="">All Project Types</option>
            <option value="web-development">Web Development</option>
            <option value="mobile-app">Mobile App</option>
            <option value="ai-ml">AI/ML</option>
            <option value="data-science">Data Science</option>
            <option value="iot">IoT</option>
            <option value="game-development">Game Development</option>
            <option value="research">Research</option>
            <option value="other">Other</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input-field"
          >
            <option value="">All Statuses</option>
            <option value="recruiting">Recruiting</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={filters.isPrivate}
            onChange={(e) => setFilters({ ...filters, isPrivate: e.target.value })}
            className="input-field"
          >
            <option value="">All Groups</option>
            <option value="false">Public Only</option>
            <option value="true">Private Only</option>
          </select>
        </div>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="loader"></div>
        </div>
      ) : groups.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No groups found</h3>
          <p className="text-gray-400 mb-6">
            {searchQuery ? 'Try a different search term' : 'Be the first to create a group!'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Group
          </button>
        </div>
      ) : (
        <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {groups.map((group) => (
              <GroupCard key={group._id} group={group} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-display font-bold gradient-text">
                    Create New Group
                  </h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateGroup} className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Group Name *
                    </label>
                    <input
                      type="text"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                      className="input-field"
                      placeholder="e.g., AI Chatbot Project"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={newGroup.description}
                      onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                      className="input-field min-h-[100px]"
                      placeholder="Describe your project..."
                      required
                    />
                  </div>

                  {/* Project Type and Max Members */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Project Type *
                      </label>
                      <select
                        value={newGroup.projectType}
                        onChange={(e) => setNewGroup({ ...newGroup, projectType: e.target.value })}
                        className="input-field"
                        required
                      >
                        <option value="web-development">Web Development</option>
                        <option value="mobile-app">Mobile App</option>
                        <option value="ai-ml">AI/ML</option>
                        <option value="data-science">Data Science</option>
                        <option value="iot">IoT</option>
                        <option value="game-development">Game Development</option>
                        <option value="research">Research</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Max Members *
                      </label>
                      <input
                        type="number"
                        value={newGroup.maxMembers}
                        onChange={(e) => setNewGroup({ ...newGroup, maxMembers: parseInt(e.target.value) })}
                        className="input-field"
                        min="2"
                        max="20"
                        required
                      />
                    </div>
                  </div>

                  {/* Required Skills */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Required Skills
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                        className="input-field flex-1"
                        placeholder="e.g., React, Python"
                      />
                      <button
                        type="button"
                        onClick={addSkill}
                        className="btn-secondary"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newGroup.requiredSkills.map((skill) => (
                        <span key={skill} className="skill-chip">
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tags
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        className="input-field flex-1"
                        placeholder="e.g., beginner-friendly, urgent"
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        className="btn-secondary"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newGroup.tags.map((tag) => (
                        <span key={tag} className="badge-primary">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newGroup.isPrivate}
                        onChange={(e) => setNewGroup({ ...newGroup, isPrivate: e.target.checked })}
                        className="w-5 h-5 rounded bg-dark-700 border-dark-600"
                      />
                      <span className="text-gray-300">Make this group private</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newGroup.requiresApproval}
                        onChange={(e) => setNewGroup({ ...newGroup, requiresApproval: e.target.checked })}
                        className="w-5 h-5 rounded bg-dark-700 border-dark-600"
                      />
                      <span className="text-gray-300">Require approval for new members</span>
                    </label>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary flex-1">
                      Create Group
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Groups;