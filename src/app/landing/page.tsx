'use client';

import { useRouter } from 'next/navigation';
import { Database, Zap, Shield, FileText, Code, TrendingUp, Check, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <img 
                src="/logo.png" 
                alt="APIFlow" 
                className="h-10 w-auto object-contain"
              />
            </div>
            <div className="flex items-center space-x-6">
              <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 font-medium">Pricing</a>
              <button
                onClick={() => router.push('/login')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6 font-medium text-sm">
              <Zap className="w-4 h-4" />
              <span>No coding required • Launch in minutes</span>
            </div>
            <h1 className="text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
              Turn Your Database Into<br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Powerful REST APIs
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Connect any database and instantly generate production-ready APIs with built-in authentication, 
              automatic documentation, rate limiting, and analytics. Zero code. Zero hassle.
            </p>
            <div className="flex justify-center space-x-4 mb-12">
              <button
                onClick={() => router.push('/signup')}
                className="group bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center space-x-2"
              >
                <span>Start Building Free</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => router.push('/login')}
                className="bg-white text-gray-700 border-2 border-gray-300 px-8 py-4 rounded-xl text-lg font-semibold hover:border-gray-400 hover:shadow-md transition-all"
              >
                Sign In
              </button>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-8 border-t border-gray-200">
              <div>
                <div className="text-3xl font-bold text-gray-900">10+</div>
                <div className="text-sm text-gray-600">Database Types</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">&lt;5 min</div>
                <div className="text-sm text-gray-600">Setup Time</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">100%</div>
                <div className="text-sm text-gray-600">No-Code</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Database Support */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Works With Your Database</h2>
            <p className="text-lg text-gray-600">Support for all major databases and data sources</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {['MySQL', 'PostgreSQL', 'MongoDB', 'MSSQL', 'SQLite', 'MariaDB', 'Google Sheets', 'Firebase', 'Airtable', 'Supabase'].map((db) => (
              <div key={db} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow text-center">
                <Database className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <div className="font-semibold text-gray-900">{db}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need, Built-In</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Production-ready features that would take months to build yourself
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Lightning Fast Setup</h3>
              <p className="text-gray-700 leading-relaxed">Connect your database and generate all CRUD endpoints instantly. No configuration files, no boilerplate code.</p>
            </div>

            <div className="group p-8 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Enterprise Security</h3>
              <p className="text-gray-700 leading-relaxed">API key authentication, rate limiting, IP whitelisting, and request validation built-in from day one.</p>
            </div>

            <div className="group p-8 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Auto Documentation</h3>
              <p className="text-gray-700 leading-relaxed">Beautiful, interactive API docs generated automatically. Always up-to-date with your schema.</p>
            </div>

            <div className="group p-8 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Code className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Custom Endpoints</h3>
              <p className="text-gray-700 leading-relaxed">Need complex queries? Create custom endpoints with joins, filters, and aggregations through our visual builder.</p>
            </div>

            <div className="group p-8 bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Real-time Analytics</h3>
              <p className="text-gray-700 leading-relaxed">Monitor API usage, track performance metrics, and identify issues before they impact your users.</p>
            </div>

            <div className="group p-8 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Database className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Schema Explorer</h3>
              <p className="text-gray-700 leading-relaxed">Visualize and browse your database structure. Test queries directly in your browser with instant results.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Start free, scale as you grow</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Tier */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border-2 border-gray-200 hover:border-blue-300 transition-colors">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
                <div className="text-4xl font-extrabold text-gray-900 mb-1">$0</div>
                <p className="text-gray-600">Perfect for getting started</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">1 Database connection</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">10,000 API requests/month</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Automatic documentation</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">API key authentication</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Community support</span>
                </li>
              </ul>
              <button
                onClick={() => router.push('/signup')}
                className="w-full bg-gray-100 text-gray-900 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Start Free
              </button>
            </div>

            {/* Pro Tier */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-8 rounded-2xl shadow-2xl transform scale-105 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">MOST POPULAR</span>
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                <div className="text-4xl font-extrabold text-white mb-1">$49</div>
                <p className="text-blue-100">per month</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-white font-medium">Unlimited databases</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-white font-medium">1M API requests/month</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-white font-medium">Custom endpoints</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-white font-medium">Advanced rate limiting</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-white font-medium">Real-time analytics</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-white font-medium">Priority support</span>
                </li>
              </ul>
              <button
                onClick={() => router.push('/signup')}
                className="w-full bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-lg"
              >
                Start Pro Trial
              </button>
            </div>

            {/* Enterprise Tier */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border-2 border-gray-200 hover:border-blue-300 transition-colors">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
                <div className="text-4xl font-extrabold text-gray-900 mb-1">Custom</div>
                <p className="text-gray-600">For large teams</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Unlimited everything</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Custom API limits</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Dedicated support</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">SLA guarantee</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">On-premise deployment</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Custom integrations</span>
                </li>
              </ul>
              <button
                onClick={() => router.push('/signup')}
                className="w-full bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Build Your API?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join developers who are building faster with APIFlow
          </p>
          <button
            onClick={() => router.push('/signup')}
            className="bg-white text-blue-600 px-10 py-4 rounded-xl text-lg font-bold hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5"
          >
            Get Started Free — No Credit Card Required
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <img 
                src="/logo.png" 
                alt="APIFlow" 
                className="h-8 w-auto object-contain mb-4 brightness-0 invert"
              />
              <p className="text-sm">Transform your database into powerful APIs in minutes.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm">
            <p>&copy; 2024 APIFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
