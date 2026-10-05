export function WaterLoader(){
 return <div className="water-loader-overlay" role="status" aria-live="polite" aria-label="Preparando tu espacio de trabajo">
  <div className="water-loader" aria-hidden="true">
   <div className="water-loader__glow"/>
   <div className="water-loader__vessel"><div className="water-loader__water"><span className="water-loader__wave water-loader__wave--back"/><span className="water-loader__wave water-loader__wave--front"/><span className="water-loader__bubble water-loader__bubble--one"/><span className="water-loader__bubble water-loader__bubble--two"/><span className="water-loader__bubble water-loader__bubble--three"/></div></div>
  </div>
  <div className="water-loader__copy"><strong>Preparando tu espacio</strong><span>El agua ya está en movimiento.</span></div>
 </div>;
}
