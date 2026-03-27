/**
 * 🎬 Input Component Examples - LUMEN Design System
 * Cinema Online - اونلاين سينما
 * 
 * @description Example usage of Input component with all variants and states
 */

import { useState } from 'react'
import Input from '../components/ui/Input'
import { Mail, Lock, Search, User } from 'lucide-react'

export default function InputExample() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [search, setSearch] = useState('')
  const [username, setUsername] = useState('')

  return (
    <div className="min-h-screen bg-lumen-void p-8">
      <div className="max-w-2xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-lumen-cream mb-2">
            Input Component Examples
          </h1>
          <p className="text-lumen-silver">
            LUMEN Design System - Form Input Variants
          </p>
        </div>

        {/* Sizes */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-lumen-cream">Sizes</h2>
          <div className="space-y-4">
            <Input
              size="sm"
              label="Small Input"
              placeholder="Enter text..."
              helperText="This is a small input (h-10)"
            />
            <Input
              size="md"
              label="Medium Input (Default)"
              placeholder="Enter text..."
              helperText="This is a medium input (h-11)"
            />
            <Input
              size="lg"
              label="Large Input"
              placeholder="Enter text..."
              helperText="This is a large input (h-12)"
            />
          </div>
        </section>

        {/* States */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-lumen-cream">States</h2>
          <div className="space-y-4">
            <Input
              label="Default State"
              placeholder="Enter your email..."
              helperText="This is the default state"
            />
            <Input
              label="Error State"
              placeholder="Enter your email..."
              error="Please enter a valid email address"
              value="invalid-email"
            />
            <Input
              label="Valid State"
              placeholder="Enter your email..."
              valid
              value="user@example.com"
              helperText="Email is valid"
            />
            <Input
              label="Disabled State"
              placeholder="This input is disabled"
              disabled
              value="Disabled input"
            />
          </div>
        </section>

        {/* With Icons */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-lumen-cream">With Icons</h2>
          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email..."
              icon={<Mail className="w-5 h-5" />}
              iconPosition="left"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password..."
              icon={<Lock className="w-5 h-5" />}
              iconPosition="left"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="Search"
              type="search"
              placeholder="Search movies..."
              icon={<Search className="w-5 h-5" />}
              iconPosition="right"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Input
              label="Username"
              placeholder="Choose a username..."
              icon={<User className="w-5 h-5" />}
              iconPosition="left"
              valid={username.length >= 3}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              helperText="Username must be at least 3 characters"
            />
          </div>
        </section>

        {/* Form Example */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-lumen-cream">Login Form Example</h2>
          <div className="bg-lumen-surface border border-white/15 rounded-2xl p-6 space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="w-5 h-5" />}
              iconPosition="left"
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              icon={<Lock className="w-5 h-5" />}
              iconPosition="left"
              required
            />
            <button className="w-full bg-lumen-gold text-lumen-void font-medium py-2.5 rounded-xl hover:brightness-110 transition-all">
              Sign In
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
