import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Header from '../components/Header'

describe('Header Component', () => {
  it('renders ResuMatch title and server status', () => {
    render(
      <Header
        serverStatus="Online"
        token={null}
        userEmail=""
        historyLength={0}
        setDrawerOpen={vi.fn()}
        handleLogout={vi.fn()}
        setAuthModalOpen={vi.fn()}
        setIsRegister={vi.fn()}
        setAuthError={vi.fn()}
        darkMode={false}
        setDarkMode={vi.fn()}
        isPremium={false}
        handleUpgrade={vi.fn()}
      />
    )

    expect(screen.getByText(/ResuMatch/i)).toBeInTheDocument()
    expect(screen.getByText(/Server: Online/i)).toBeInTheDocument()
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument()
  })

  it('renders user email and history button when authenticated', () => {
    const mockSetDrawer = vi.fn()
    render(
      <Header
        serverStatus="Online"
        token="mock-jwt-token"
        userEmail="engineer@example.com"
        historyLength={4}
        setDrawerOpen={mockSetDrawer}
        handleLogout={vi.fn()}
        setAuthModalOpen={vi.fn()}
        setIsRegister={vi.fn()}
        setAuthError={vi.fn()}
        darkMode={false}
        setDarkMode={vi.fn()}
        isPremium={false}
        handleUpgrade={vi.fn()}
      />
    )

    expect(screen.getByText('engineer@example.com')).toBeInTheDocument()
    expect(screen.getByText(/History \(4\)/i)).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })
})

