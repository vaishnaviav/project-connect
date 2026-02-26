import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Search, MessageCircle, CheckCircle, Zap, Shield, TrendingUp, ArrowRight } from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: <Search className="w-6 h-6" />,
      title: "Smart Matching",
      description: "Our AI-powered algorithm finds the perfect partners based on skills and interests"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Form Groups",
      description: "Create or join project groups with like-minded collaborators"
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Real-time Chat",
      description: "Communicate instantly with your team members"
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: "Task Management",
      description: "Track progress with integrated task boards"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Fast & Efficient",
      description: "Find partners in minutes, not days"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Safe & Secure",
      description: "Reputation system ensures trustworthy collaboration"
    }
  ];

  const stats = [
    { value: "500+", label: "Active Users" },
    { value: "200+", label: "Groups Formed" },
    { value: "1000+", label: "Projects Completed" },
    { value: "95%", label: "Success Rate" }
  ];

  return (
    <div className="min-h-screen bg-dark-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-600/10 rounded-full blur-3xl floating-particle" 
             style={{ '--float-x': '30px', '--float-y': '-30px' }}></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl floating-particle" 
             style={{ '--float-x': '-40px', '--float-y': '40px' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-accent-cyan/10 rounded-full blur-3xl floating-particle"
             style={{ '--float-x': '20px', '--float-y': '-20px' }}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold gradient-text">
              ProjectConnect
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <Link
              to="/login"
              className="px-6 py-2 text-gray-300 hover:text-primary-400 font-medium transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-primary-600/50"
            >
              Get Started
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl md:text-7xl font-display font-bold mb-6 leading-tight">
              Find Your Perfect
              <br />
              <span className="gradient-text">Project Partner</span>
            </h1>
            <p className="text-xl text-gray-400 mb-10 max-w-3xl mx-auto">
              Connect with talented individuals, form powerful teams, and bring your projects to life.
              Built for students, by students.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/register"
                className="group px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-xl hover:shadow-primary-600/50 flex items-center gap-2"
              >
                Start Matching
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="px-8 py-4 bg-dark-800 hover:bg-dark-700 text-gray-200 font-semibold rounded-lg transition-all duration-200 border border-dark-600">
                Learn More
              </button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20"
          >
            {stats.map((stat, index) => (
              <div key={index} className="glass-card p-6">
                <div className="text-4xl font-bold gradient-text mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-display font-bold mb-4 gradient-text">
              Why Choose Us?
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to find partners and manage projects in one place
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass-card-hover p-8 group cursor-pointer"
              >
                <div className="w-14 h-14 bg-primary-600/20 rounded-lg flex items-center justify-center text-primary-400 mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-display font-semibold mb-3 text-gray-100">
                  {feature.title}
                </h3>
                <p className="text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto glass-card p-12 text-center"
        >
          <TrendingUp className="w-16 h-16 text-primary-400 mx-auto mb-6" />
          <h2 className="text-4xl font-display font-bold mb-4 gradient-text">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of students already collaborating on amazing projects
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-10 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-xl hover:shadow-primary-600/50"
          >
            Create Free Account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-dark-700">
        <div className="max-w-7xl mx-auto text-center text-gray-400">
          <p>© 2025 ProjectConnect. All rights reserved.</p>
          <p className="mt-2 text-sm">Built with ❤️ by GCE Kannur Students</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;