import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Calendar, Star, Edit2, Plus, X, MessageCircle } from 'lucide-react';
import { userAPI } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const Profile = () => {
  const { id } = useParams();
  const { user: currentUser, updateUser } = useAuthStore();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [editForm, setEditForm] = useState({
    skills: [],
    interests: [],
  });

  const isOwnProfile = !id || id === currentUser?._id;

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      if (isOwnProfile) {
        setUser(currentUser);
        setEditForm({
          skills: currentUser?.skills || [],
          interests: currentUser?.interests || [],
        });
      } else {
        const response = await userAPI.getUser(id);
        setUser(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !editForm.skills.some(s => s.name === skillInput.trim())) {
      setEditForm({
        ...editForm,
        skills: [...editForm.skills, { name: skillInput.trim(), level: 'intermediate' }]
      });
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillName) => {
    setEditForm({
      ...editForm,
      skills: editForm.skills.filter(s => s.name !== skillName)
    });
  };

  const handleAddInterest = () => {
    if (interestInput.trim() && !editForm.interests.includes(interestInput.trim())) {
      setEditForm({
        ...editForm,
        interests: [...editForm.interests, interestInput.trim()]
      });
      setInterestInput('');
    }
  };

  const handleRemoveInterest = (interest) => {
    setEditForm({
      ...editForm,
      interests: editForm.interests.filter(i => i !== interest)
    });
  };

  const handleSave = async () => {
    try {
      await userAPI.updateSkills(editForm.skills);
      await userAPI.updateInterests(editForm.interests);
      updateUser({ skills: editForm.skills, interests: editForm.interests });
      setUser({ ...user, ...editForm });
      toast.success('Profile updated!');
      setEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="loader"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 mb-8"
      >
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-32 h-32 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-full flex items-center justify-center text-white font-bold text-5xl">
            {user.name?.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-display font-bold gradient-text mb-2">
                  {user.name}
                </h1>
                <div className="flex items-center gap-4 text-gray-400">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {user.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {!isOwnProfile && (
                  <Link
                    to={`/messages?user=${user._id}`}
                    className="btn-primary flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </Link>
                )}
                
                {isOwnProfile && (
                  <button
                    onClick={() => editing ? handleSave() : setEditing(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    {editing ? 'Save Changes' : 'Edit Profile'}
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">
                  {user.reputationScore?.toFixed(1) || '0.0'}
                </div>
                <div className="text-gray-400">Reputation</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">
                  {user.ratings?.length || 0}
                </div>
                <div className="text-gray-400">Ratings</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Skills */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-6"
        >
          <h2 className="text-2xl font-display font-bold mb-6">Skills</h2>

          {editing && (
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                placeholder="Add skill..."
                className="input-field flex-1"
              />
              <button onClick={handleAddSkill} className="btn-secondary">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {(editing ? editForm.skills : user.skills)?.map((skill) => (
              <span key={skill.name} className="skill-chip">
                {skill.name}
                {editing && (
                  <button
                    onClick={() => handleRemoveSkill(skill.name)}
                    className="ml-2"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
            {(!user.skills || user.skills.length === 0) && !editing && (
              <p className="text-gray-400">No skills added yet</p>
            )}
          </div>
        </motion.div>

        {/* Interests */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-6"
        >
          <h2 className="text-2xl font-display font-bold mb-6">Interests</h2>

          {editing && (
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
                placeholder="Add interest..."
                className="input-field flex-1"
              />
              <button onClick={handleAddInterest} className="btn-secondary">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {(editing ? editForm.interests : user.interests)?.map((interest) => (
              <span key={interest} className="badge-primary">
                {interest}
                {editing && (
                  <button
                    onClick={() => handleRemoveInterest(interest)}
                    className="ml-2"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
            {(!user.interests || user.interests.length === 0) && !editing && (
              <p className="text-gray-400">No interests added yet</p>
            )}
          </div>
        </motion.div>
      </div>

      {editing && (
        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={() => {
              setEditing(false);
              setEditForm({
                skills: user.skills || [],
                interests: user.interests || [],
              });
            }}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary">
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;