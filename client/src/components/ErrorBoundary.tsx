'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        if (typeof window !== 'undefined' && window.console) {
            console.error('ErrorBoundary caught:', error, info?.componentStack);
        }
        if (this.props.onError) this.props.onError(error, info);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    handleReload = () => {
        if (typeof window !== 'undefined') window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-dvh flex-col items-center justify-center bg-bg p-8 text-center text-fg">
                    <h2 className="text-lg font-semibold">Something went wrong</h2>
                    <p className="mt-2 max-w-md text-sm text-fg-muted">
                        The chat hit an unexpected error. Details are in the browser console.
                    </p>
                    {this.state.error?.message && (
                        <p className="mt-3 max-w-lg break-words font-mono text-xs text-fg-subtle">{this.state.error.message}</p>
                    )}
                    <div className="mt-6 flex gap-2">
                        <button type="button" onClick={this.handleReset} className="btn btn-primary">Try again</button>
                        <button type="button" onClick={this.handleReload} className="btn btn-secondary">Reload page</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
