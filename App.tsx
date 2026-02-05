
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
  
  // Impedisce invii multipli contemporanei per lo stesso ID
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
    // Esci se non c'è URL, se è già sincronizzato o se sta già sincronizzando questo ID
    if (!settings.googleScriptUrl || trip.synced || syncingIds.current.has(trip.id)) return;
    
    syncingIds.current.add(trip.id);
    try {
      const vehicle = vehicles.find(v => v.id === trip.vehicleId);
      
      // Assicuriamoci che i KM siano numeri puri e non stringhe
      const payload = {
        id: trip.id,
        driverName: trip.driverName,
        vehiclePlate: vehicle?.plate || 'N/D',
        startKm: Number(trip.startKm),
        endKm: Number(trip.endKm),
        destination: trip.destination,
        reason: trip.reason,
        refuelingDone: trip.refuelingDone,
        maintenanceNeeded: trip.maintenanceNeeded.needed,
        maintenanceDesc: trip.maintenanceNeeded.description,
        notes: trip.notes
      };

      await fetch(settings.googleScriptUrl, {
        method: 'POST',
        mode: 'no-cors', // Necessario per Google Apps Script
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Aggiorna lo stato locale per segnare come inviato
      setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, synced: true } : t));
    } catch (error) {
      console.error("Sync Error:", error);
    } finally {
      syncingIds.current.delete(trip.id);
    }
  };

  const handleSaveTrip = async (tripData: Partial<Trip>) => {
    if (tripData.status === TripStatus.COMPLETED) {
      const completedTrip = tripData as Trip;
      setTrips(prev => prev.map(t => t.id === completedTrip.id ? completedTrip : t));
      setActiveTrip(null);
      
      // Tenta l'invio immediato
      if (settings.googleScriptUrl) {
        setTimeout(() => syncTripToGoogleSheets(completedTrip), 1000);
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
      title={currentView === 'DASHBOARD' ? 'ProCiv Log' : currentView.replace('_', ' ')}
      onBack={currentView !== 'DASHBOARD' ? () => setCurrentView('DASHBOARD') : undefined}
      actions={
        currentView === 'DASHBOARD' && (
            <button onClick={() => setCurrentView('ADMIN')} className="p-2 text-white bg-blue-800 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
            </button>
        )
      }
    >
      {currentView === 'DASHBOARD' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-400 flex items-center justify-center mb-4 shadow-lg text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
            </div>
            
            {activeTrip ? (
              <div className="w-full bg-blue-50 rounded-2xl p-5 border border-blue-200 mb-4 text-left">
                <div className="flex justify-between items-center mb-2">
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded uppercase animate-pulse">In Servizio</span>
                  <span className="text-xs font-bold text-blue-900">{vehicles.find(v => v.id === activeTrip.vehicleId)?.plate}</span>
                </div>
                <p className="text-lg font-black text-blue-900 leading-tight mb-4">{activeTrip.destination}</p>
                <button 
                  onClick={() => setCurrentView('END_TRIP')}
                  className="w-full bg-blue-900 text-white py-4 rounded-xl font-black text-sm shadow-lg"
                >
                  REGISTRA RIENTRO
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setCurrentView('NEW_TRIP')}
                className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-3"
              >
                AVVIA USCITA
              </button>
            )}

            {settings.googleScriptUrl && trips.some(t => t.status === TripStatus.COMPLETED && !t.synced) && (
              <button 
                onClick={bulkSync}
                className="mt-4 text-[10px] font-black text-green-600 bg-green-50 px-4 py-2 rounded-full border border-green-200"
                disabled={isSyncingGlobal}
              >
                {isSyncingGlobal ? 'SINCRONIZZAZIONE...' : '⚠️ INVIA DATI PENDENTI'}
              </button>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest px-2">Ultime Missioni</h3>
            {trips.filter(t => t.status === TripStatus.COMPLETED).slice(0, 5).map(trip => (
              <div key={trip.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-black text-gray-800 text-sm">{vehicles.find(v => v.id === trip.vehicleId)?.plate}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">{trip.destination}</p>
                </div>
                <div className="flex items-center gap-2">
                   {trip.synced && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                   <p className="text-sm font-black text-blue-900">{(trip.endKm || 0) - trip.startKm} KM</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentView === 'NEW_TRIP' && <TripForm onSave={handleSaveTrip} vehicles={vehicles} volunteers={volunteers} />}
      {currentView === 'END_TRIP' && activeTrip && <TripForm onSave={handleSaveTrip} activeTrip={activeTrip} vehicles={vehicles} volunteers={volunteers} />}
      
      {currentView === 'ADMIN' && (
        <div className="space-y-6">
          <div className="bg-green-50 p-6 rounded-3xl border border-green-200">
             <h3 className="text-sm font-black text-green-900 uppercase mb-2 tracking-widest">Configurazione Foglio</h3>
             <input 
                className="w-full p-3 text-xs rounded-xl border border-green-300 outline-none"
                placeholder="URL Web App Google Script"
                value={settings.googleScriptUrl}
                onChange={(e) => setSettings({...settings, googleScriptUrl: e.target.value})}
             />
             <p className="mt-2 text-[9px] text-green-600 italic">I dati verranno aggiunti al foglio a ogni rientro.</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
             <h3 className="text-sm font-black text-gray-800 uppercase mb-4 tracking-widest">Anagrafica Mezzi</h3>
             <div className="space-y-2 mb-4">
                {vehicles.map(v => (
                  <div key={v.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <p className="font-bold text-gray-800 text-sm">{v.plate} - {v.model}</p>
                    <button onClick={() => setVehicles(vehicles.filter(item => item.id !== v.id))} className="text-red-400">
                      Elimina
                    </button>
                  </div>
                ))}
             </div>
             <form onSubmit={(e: any) => {
                 e.preventDefault();
                 setVehicles([...vehicles, { id: Date.now().toString(), plate: e.target.plate.value, model: e.target.model.value }]);
                 e.target.reset();
             }} className="flex gap-2">
                <input name="plate" placeholder="Targa" className="flex-1 text-xs p-3 rounded-xl border border-gray-200" required />
                <input name="model" placeholder="Modello" className="flex-1 text-xs p-3 rounded-xl border border-gray-200" required />
                <button className="bg-blue-600 text-white px-4 rounded-xl shadow-lg">+</button>
             </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
