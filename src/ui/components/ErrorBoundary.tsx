import { Component, type ReactNode } from 'react';

/** Evita una pantalla en blanco ante un error inesperado: las respuestas siguen guardadas. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="panel stack" role="alert">
        <h2>Algo salió mal al mostrar esta sección</h2>
        <p className="prose">Tus respuestas están guardadas. Probá volver al inicio; si el problema sigue, descargá una copia desde Ajustes.</p>
        <p className="small muted data">{this.state.error.message}</p>
        <div><button type="button" className="btn btn-primary" onClick={() => { this.setState({ error: null }); window.location.hash = 'inicio'; }}>Volver al inicio</button></div>
      </div>
    );
  }
}
