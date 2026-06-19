﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <div className="w-16 h-16 flex items-center justify-center bg-[#DC2626]/10 rounded-2xl mb-4">
            <AlertCircle size={32} className="text-[#DC2626]" />
          </div>
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-2">页面出现错误</h2>
          <p className="text-sm text-[#6C757B] mb-1 max-w-md text-center">
            {this.state.error?.message || '发生了未知错误'}
          </p>
          <p className="text-xs text-[#6C757B]/60 mb-6">请尝试刷新页面，如问题持续请联系技术支持</p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-1.5 px-4 py-2 text-sm border border-[#D97706]/40 text-[#D97706] rounded-lg hover:bg-[#D97706]/5 transition-colors"
            >
              <RefreshCw size={14} /> 重试
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#D97706] text-white rounded-lg hover:bg-[#B45309] transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
