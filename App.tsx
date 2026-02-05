
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import TripForm from './components/TripForm';
import { Trip, TripStatus, Vehicle, Volunteer, INITIAL_VEHICLES, INITIAL_VOLUNTEERS, AppSettings } from './types';

type View = 'DASHBOARD' | 'NEW_TRIP' | 'END_TRIP' | 'HISTORY' | 'ADMIN';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [volunteers, setVolunteers] = useState<Volunteer[]>(INITIAL_VOLUNTEERS);
  const [settings, setSettings] = useState<AppSettings>({ googleScriptUrl: '' });
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [isSyncingGlobal, setIsSyncingGlobal] = useState(false);
  
  const syncingIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const savedTrips = localStorage.getItem('prociv_trips');
    const savedVehicles = localStorage.getItem('prociv_vehicles');
    const savedVolunteers = localStorage.getItem('prociv_volunteers');
    const savedSettings = localStorage.getItem('prociv_settings');

    if (savedTrips) {
      const parsed = JSON.parse(savedTrips);
      setTrips(parsed);
      const active = parsed.find((t: Trip) => t.status === TripStatus.ACTIVE);
      if (active) setActiveTrip(active);
    }
    if (savedVehicles) setVehicles(JSON.parse(savedVehicles));
    if (savedVolunteers) setVolunteers(JSON.parse(savedVolunteers));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  useEffect(() => localStorage.setItem('prociv_trips', JSON.stringify(trips)), [trips]);
  useEffect(() => localStorage.setItem('prociv_vehicles', JSON.stringify(vehicles)), [vehicles]);
  useEffect(() => localStorage.setItem('prociv_volunteers', JSON.stringify(volunteers)), [volunteers]);
  useEffect(() => localStorage.setItem('prociv_settings', JSON.stringify(settings)), [settings]);

  const syncTripToGoogleSheets = async (trip: Trip) => {
    if (!settings.googleScriptUrl || trip.synced || syncingIds.current.has(trip.id)) return;
    
    syncingIds.current.add(trip.id);
    try {
      const vehicle = vehicles.find(v => v.id === trip.vehicleId);
      
      const payload = {
        id: trip.id,
        driverName: trip.driverName,
        vehiclePlate: vehicle?.plate || 'N/D',
        startKm: Math.round(Number(trip.startKm)),
        endKm: Math.round(Number(trip.endKm)),
        destination: trip.destination,
        reason: trip.reason,
        refuelingDone: trip.refuelingDone,
        maintenanceNeeded: trip.maintenanceNeeded.needed,
        maintenanceDesc: trip.maintenanceNeeded.description,
        notes: trip.notes
      };

      await fetch(settings.googleScriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, synced: true } : t));
    } catch (error) {
      console.error("Errore sincronizzazione:", error);
    } finally {
      setTimeout(() => syncingIds.current.delete(trip.id), 2000);
    }
  };

  const handleSaveTrip = async (tripData: Partial<Trip>) => {
    if (tripData.status === TripStatus.COMPLETED) {
      const completedTrip = tripData as Trip;
      setTrips(prev => prev.map(t => t.id === completedTrip.id ? completedTrip : t));
      setActiveTrip(null);
      if (settings.googleScriptUrl) {
        setTimeout(() => syncTripToGoogleSheets(completedTrip), 800);
      }
    } else {
      const newTrip = tripData as Trip;
      setTrips(prev => [newTrip, ...prev]);
      setActiveTrip(newTrip);
    }
    setCurrentView('DASHBOARD');
  };

  const bulkSync = async () => {
    setIsSyncingGlobal(true);
    const unsynced = trips.filter(t => t.status === TripStatus.COMPLETED && !t.synced);
    for (const trip of unsynced) {
      await syncTripToGoogleSheets(trip);
    }
    setIsSyncingGlobal(false);
  };

  return (
    <Layout 
      title={currentView === 'DASHBOARD' ? 'LOGBOOK MEZZI' : currentView.replace('_', ' ')}
      onBack={currentView !== 'DASHBOARD' ? () => setCurrentView('DASHBOARD') : undefined}
      actions={
        currentView === 'DASHBOARD' && (
            <button onClick={() => setCurrentView('ADMIN')} className="p-2 text-white bg-blue-800 rounded-full shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
            </button>
        )
      }
    >
      {currentView === 'DASHBOARD' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-yellow-400 flex items-center justify-center mb-6 shadow-2xl text-blue-900 border-4 border-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
            </div>
            
            {activeTrip ? (
              <div className="w-full bg-blue-50 rounded-3xl p-6 border-2 border-blue-200 mb-4 text-left animate-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-3">
                  <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase animate-pulse tracking-widest">In Corso</span>
                  <span className="text-sm font-black text-blue-900">{vehicles.find(v => v.id === activeTrip.vehicleId)?.plate}</span>
                </div>
                <p className="text-xl font-black text-blue-900 leading-tight mb-6">{activeTrip.destination}</p>
                <button 
                  onClick={() => setCurrentView('END_TRIP')}
                  className="w-full bg-blue-900 text-white py-5 rounded-2xl font-black text-md shadow-xl active:scale-95 transition-all"
                >
                  REGISTRA RIENTRO
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setCurrentView('NEW_TRIP')}
                className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4 hover:bg-blue-700 active:scale-95 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                </svg>
                NUOVA USCITA
              </button>
            )}

            {settings.googleScriptUrl && trips.some(t => t.status === TripStatus.COMPLETED && !t.synced) && (
              <button 
                onClick={bulkSync}
                className="mt-6 text-[10px] font-black text-green-700 bg-green-100 px-6 py-3 rounded-full border-2 border-green-200 uppercase tracking-tighter"
                disabled={isSyncingGlobal}
              >
                {isSyncingGlobal ? 'INVIO IN CORSO...' : '⚠️ INVIA DATI AL FOGLIO'}
              </button>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-[0.2em] px-4">Recenti</h3>
            {trips.filter(t => t.status === TripStatus.COMPLETED).slice(0, 5).map(trip => (
              <div key={trip.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-black text-gray-800 text-sm">{vehicles.find(v => v.id === trip.vehicleId)?.plate}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[150px]">{trip.destination}</p>
                </div>
                <div className="flex items-center gap-4">
                   {trip.synced && <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm"></div>}
                   <p className="text-md font-black text-blue-900">{(trip.endKm || 0) - trip.startKm} KM</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentView === 'NEW_TRIP' && <TripForm onSave={handleSaveTrip} vehicles={vehicles} volunteers={volunteers} />}
      {currentView === 'END_TRIP' && activeTrip && <TripForm onSave={handleSaveTrip} activeTrip={activeTrip} vehicles={vehicles} volunteers={volunteers} />}
      
      {currentView === 'ADMIN' && (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
          <div className="bg-green-50 p-6 rounded-[2rem] border-2 border-green-100">
             <h3 className="text-xs font-black text-green-900 uppercase mb-4 tracking-widest">Configurazione Cloud</h3>
             <label className="text-[10px] font-black text-green-700 uppercase">URL Google Sheets Script</label>
             <input 
                className="w-full p-4 mt-1 text-xs rounded-2xl border-2 border-green-200 outline-none focus:border-green-500 transition-all font-mono"
                placeholder="https://script.google.com/..."
                value={settings.googleScriptUrl}
                onChange={(e) => setSettings({...settings, googleScriptUrl: e.target.value})}
             />
             <p className="mt-3 text-[9px] text-green-600 font-bold uppercase leading-tight">I dati verranno inviati automaticamente al foglio Google a ogni chiusura turno.</p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-lg">
             <h3 className="text-xs font-black text-gray-800 uppercase mb-4 tracking-widest">Mezzi Protezione Civile</h3>
             <div className="space-y-2 mb-6">
                {vehicles.map(v => (
                  <div key={v.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                    <p className="font-black text-gray-800 text-sm">{v.plate} <span className="text-gray-400 font-bold ml-2">{v.model}</span></p>
                    <button onClick={() => setVehicles(vehicles.filter(item => item.id !== v.id))} className="text-red-500 p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
             </div>
             <form onSubmit={(e: any) => {
                 e.preventDefault();
                 setVehicles([...vehicles, { id: Date.now().toString(), plate: e.target.plate.value.toUpperCase(), model: e.target.model.value }]);
                 e.target.reset();
             }} className="space-y-2">
                <input name="plate" placeholder="Targa" className="w-full text-xs p-4 rounded-xl border border-gray-200 font-bold" required />
                <input name="model" placeholder="Modello (es. Defender, Ducato)" className="w-full text-xs p-4 rounded-xl border border-gray-200" required />
                <button className="w-full bg-blue-600 text-white p-4 rounded-xl font-black shadow-md">+ AGGIUNGI MEZZO</button>
             </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
