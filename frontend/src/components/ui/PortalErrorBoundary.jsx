import React from 'react';

export class PortalErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('Portal view failed:', error.message); }
  componentDidUpdate(previous) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <section className="bb-empty" role="alert"><h2>This view could not be displayed</h2><p>Your other portal sections are still available.</p><button className="btn outline" onClick={() => this.setState({ failed: false })}>Try again</button></section>;
  }
}
