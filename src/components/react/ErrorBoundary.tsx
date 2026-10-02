import { Component, type ReactNode } from 'react';

/**
 * Catches render/lifecycle errors in a subtree and renders a fallback instead
 * of letting React unmount the whole island (which would blank the page).
 */
export default class ErrorBoundary extends Component<
  { fallback?: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Bookshelf UI error:', error);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}