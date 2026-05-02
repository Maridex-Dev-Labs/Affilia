'use client';

import Link from 'next/link';
import React from 'react';

type WorkspaceErrorBoundaryProps = {
  children: React.ReactNode;
  role?: 'affiliate' | 'merchant' | null;
};

type WorkspaceErrorBoundaryState = {
  hasError: boolean;
};

export default class WorkspaceErrorBoundary extends React.Component<
  WorkspaceErrorBoundaryProps,
  WorkspaceErrorBoundaryState
> {
  state: WorkspaceErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Workspace render error:', error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const settingsHref = this.props.role === 'merchant' ? '/merchant/settings' : '/affiliate/settings';
    const overviewHref = this.props.role === 'merchant' ? '/merchant/overview' : '/affiliate/overview';

    return (
      <div className="card-surface p-8">
        <div className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">Section Unavailable</div>
        <h2 className="mt-3 text-3xl font-black italic text-white">This section hit a client-side error.</h2>
        <p className="mt-4 max-w-2xl text-sm text-[#9aa2b5]">
          The workspace shell is still available. Move to another section or open Settings while this section recovers.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={overviewHref} className="button-primary rounded-full px-5 py-3 text-sm font-semibold">
            Back to Overview
          </Link>
          <Link href={settingsHref} className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">
            Open Settings
          </Link>
        </div>
      </div>
    );
  }
}
