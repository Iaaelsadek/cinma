/**
 * 🎬 Modal Example - LUMEN Design System
 * Cinema Online - اونلاين سينما
 * 
 * @description Example usage of Modal component
 * @author Cinema Online Team
 * @version 1.0.0
 */

import { useState } from 'react'
import { Modal, Button, Input } from '../components/ui'

export function ModalExample() {
  const [isBasicOpen, setIsBasicOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSmallOpen, setIsSmallOpen] = useState(false)
  const [isLargeOpen, setIsLargeOpen] = useState(false)
  const [isNoBackdropClose, setIsNoBackdropClose] = useState(false)

  return (
    <div className="min-h-screen bg-lumen-void p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-lumen-cream mb-2">
            Modal Component Examples
          </h1>
          <p className="text-lumen-silver">
            Demonstrating various modal configurations with animations and focus management
          </p>
        </div>

        {/* Basic Modal */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-lumen-cream">Basic Modal</h2>
          <Button onClick={() => setIsBasicOpen(true)}>
            Open Basic Modal
          </Button>
          <Modal
            isOpen={isBasicOpen}
            onClose={() => setIsBasicOpen(false)}
            title="Welcome to Cinema Online"
          >
            <p className="text-lumen-silver mb-4">
              This is a basic modal with a title and content. Click the close button,
              press Escape, or click outside to close.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setIsBasicOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsBasicOpen(false)}>
                Confirm
              </Button>
            </div>
          </Modal>
        </section>

        {/* Form Modal */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-lumen-cream">Form Modal</h2>
          <Button onClick={() => setIsFormOpen(true)}>
            Open Form Modal
          </Button>
          <Modal
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            title="Sign In"
          >
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <Input
                label="Email"
                type="email"
                placeholder="your@email.com"
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
              />
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Sign In
                </Button>
              </div>
            </form>
          </Modal>
        </section>

        {/* Size Variants */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-lumen-cream">Size Variants</h2>
          <div className="flex gap-3">
            <Button onClick={() => setIsSmallOpen(true)} size="sm">
              Small Modal
            </Button>
            <Button onClick={() => setIsLargeOpen(true)} size="sm">
              Large Modal
            </Button>
          </div>
          
          <Modal
            isOpen={isSmallOpen}
            onClose={() => setIsSmallOpen(false)}
            title="Small Modal"
            size="sm"
          >
            <p className="text-lumen-silver mb-4">
              This is a small modal (max-w-md).
            </p>
            <Button onClick={() => setIsSmallOpen(false)} fullWidth>
              Close
            </Button>
          </Modal>

          <Modal
            isOpen={isLargeOpen}
            onClose={() => setIsLargeOpen(false)}
            title="Large Modal"
            size="lg"
          >
            <p className="text-lumen-silver mb-4">
              This is a large modal (max-w-2xl) with more space for content.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-lumen-muted rounded-xl">
                <h3 className="font-semibold mb-2">Feature 1</h3>
                <p className="text-sm text-lumen-silver">Description here</p>
              </div>
              <div className="p-4 bg-lumen-muted rounded-xl">
                <h3 className="font-semibold mb-2">Feature 2</h3>
                <p className="text-sm text-lumen-silver">Description here</p>
              </div>
            </div>
            <Button onClick={() => setIsLargeOpen(false)} fullWidth>
              Close
            </Button>
          </Modal>
        </section>

        {/* No Backdrop Close */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-lumen-cream">
            Prevent Backdrop Close
          </h2>
          <Button onClick={() => setIsNoBackdropClose(true)}>
            Open Modal (No Backdrop Close)
          </Button>
          <Modal
            isOpen={isNoBackdropClose}
            onClose={() => setIsNoBackdropClose(false)}
            title="Important Action"
            closeOnBackdropClick={false}
            closeOnEscape={false}
          >
            <p className="text-lumen-silver mb-4">
              This modal requires explicit confirmation. You cannot close it by
              clicking outside or pressing Escape.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setIsNoBackdropClose(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => setIsNoBackdropClose(false)}
              >
                Delete
              </Button>
            </div>
          </Modal>
        </section>

        {/* Focus Trap Demo */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-lumen-cream">
            Focus Management
          </h2>
          <p className="text-lumen-silver text-sm">
            When a modal opens, focus is trapped inside. Try pressing Tab to
            navigate between focusable elements. Focus will cycle within the modal.
          </p>
        </section>
      </div>
    </div>
  )
}

export default ModalExample
