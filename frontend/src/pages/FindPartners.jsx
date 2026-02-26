import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, UserPlus, MessageCircle, Star } from 'lucide-react';
import { matchAPI, userAPI } from '../utils/api';
import toast from 'react-hot-toast';

const FindPartners = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const response = await matchAPI.findPartners(12);
      setPartners(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchPartners();
      return;
    }
    setLoading(true);
    try {
      const response = await userAPI.searchUsers(searchQuery);
      setPartners(response.data.data?.map(user => ({ user, matchScore: 0 })) || []);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const PartnerCard = ({ partner }) => {
    const { user, matchScore } = partner;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card-hover p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-full flex items-center justify-center text-white font-bold text-xl">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{user.name}</h3>
              <p className="text-sm text-gray-400">{user.department || 'Student'}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-400">
                  {user.reputationScore?.toFixed(1) || '0.0'}
                </span>
              </div>
            </div>
          </div>
          {matchScore > 0 && (
            <span className="badge-success">{matchScore}% Match</span>
          )}
        </div>

        {user.skills && user.skills.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">Skills</p>
            <div className="flex flex-wrap gap-2">
              {user.skills.slice(0, 5).map((skill) => (
                <span key={skill.name} className="skill-chip text-xs">
                  {skill.name}
                </span>
              ))}
              {user.skills.length > 5 && (
                <span className="text-xs text-gray-400">
                  +{user.skills.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {user.interests && user.interests.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">Interests</p>
            <div className="flex flex-wrap gap-2">
              {user.interests.slice(0, 3).map((interest) => (
                <span key={interest} className="badge-primary text-xs">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Link to={`/profile/${user._id}`} className="btn-outline flex-1 text-center">
            View Profile
          </Link>
          <Link
            to={`/messages?user=${user._id}`}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Message
          </Link>
        </div>
      </motion.div>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-2 gradient-text">
          Find Partners
        </h1>
        <p className="text-gray-400">Discover talented individuals to collaborate with</p>
      </div>

      <div className="glass-card p-6 mb-8">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name, skills, or interests..."
              className="input-field pl-11 w-full"
            />
          </div>
          <button onClick={handleSearch} className="btn-primary">
            Search
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="loader"></div>
        </div>
      ) : partners.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <UserPlus className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No partners found</h3>
          <p className="text-gray-400">Try updating your profile to get better matches</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partners.map((partner) => (
            <PartnerCard key={partner.user._id} partner={partner} />
          ))}
        </div>
      )}
    </div>
  );
};

export default FindPartners;