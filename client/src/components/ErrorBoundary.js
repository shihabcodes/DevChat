'use client';

import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
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
                <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#0F0F23] text-[#F9FAFB]">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-semibold mb-2 text-[#F87171]">Something went wrong</h2>
                    <p className="text-sm text-[#9CA3AF] mb-1 max-w-md">
                        The chat hit an unexpected error. We logged the details to the console.
                    </p>
                    {this.state.error?.message && (
                        <p className="text-[0.75rem] text-[#6B7280] font-mono mb-6 max-w-lg break-words">
                            {this.state.error.message}
                        </p>
                    )}
                    <div className="flex gap-3">
                        <button
                            onClick={this.handleReset}
                            className="px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold transition-colors cursor-pointer"
                        >
                            Try again
                        </button>
                        <button
                            onClick={this.handleReload}
                            className="px-4 py-2 rounded-lg border border-[#2D2D5E] hover:border-[#4F46E5] text-[#D1D5DB] text-sm font-semibold transition-colors cursor-pointer"
                        >
                            Reload page
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
