
import React, { useState } from 'react';
import { Trip, TripStatus, Vehicle, Volunteer } from '../types';

interface TripFormProps {
  onSave: (trip: Partial<Trip>) => void;
  activeTrip?: Trip;
  vehicles: Vehicle[];
  volunteers: Volunteer[];
}

const TripForm: React.FC<TripFormProps> = ({ onSave, activeTrip, vehicles, volunteers }) => {
  const isEnding = !!activeTrip;
  
  const [formData, setFormData] = useState({
    vehicleId: activeTrip?.vehicleId || (vehicles[0]?.id || ''),
    volunteerId: activeTrip?.volunteerId || (volunteers[0]?.id || ''),
    startKm: activeTrip?.startKm || 0,
    endKm: activeTrip?.endKm || 0,
    destination: activeTrip?.destination || '',
    reason: activeTrip?.reason || '',
    notes: activeTrip?.notes || '',
    refuelingDone: activeTrip?.refuelingDone || false,
    maintenanceNeeded: activeTrip?.maintenanceNeeded.needed || false,
    maintenanceDescription: activeTrip?.maintenanceNeeded.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedVolunteer = volunteers.find(v => v.id === formData.volunteerId);
    const driverName = selectedVolunteer ? `${selectedVolunteer.name} ${selectedVolunteer.surname}` : 'Sconosciuto';

    // Usiamo Math.round per evitare approssimazioni errate (es. 9.999 -> 9)
    const cleanStartKm = Math.round(Number(formData.startKm));
    const cleanEndKm = Math.round(Number(formData.endKm));

    if (isEnding) {
      onSave({
        ...activeTrip,
        endTime: new Date().toISOString(),
        endKm: cleanEndKm,
        refuelingDone: formData.refuelingDone,
        maintenanceNeeded: {
          needed: formData.maintenanceNeeded,
          description: formData.maintenanceDescription
        },
        notes: formData.notes,
        status: TripStatus.COMPLETED
      });
    } else {
      onSave({
        id: 'T' + Date.now() + Math.random().toString(36).substr(2, 5),
        vehicleId: formData.vehicleId,
        volunteerId: formData.volunteerId,
        driverName: driverName,
        startKm: cleanStartKm,
        destination: formData.destination,
        reason: formData.reason,
        notes: formData.notes,
        refuelingDone: formData.refuelingDone,
        startTime: new Date().toISOString(),
        status: TripStatus.ACTIVE,
        maintenanceNeeded: { needed: false, description: '' },
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-4">
        {!isEnding ? (
          <>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mezzo Operativo</label>
              <select 
                className="w-full rounded-xl border border-gray-200 p-3 mt-1 bg-gray-50 font-bold"
                value={formData.vehicleId}
                onChange={(e) => setFormData({...formData, vehicleId: e.target.value})}
                required
              >
                <option value="" disabled>Seleziona Mezzo</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contachilometri (KM)</label>
              <input
                type="number"
                inputMode="numeric"
                className="w-full rounded-xl border border-gray-200 p-3 mt-1 font-black text-lg"
                value={formData.startKm}
                onChange={(e) => setFormData({...formData, startKm: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Destinazione</label>
              <input
                type="text"
                className="w-full rounded-xl border border-gray-200 p-3 mt-1"
                placeholder="Es. Sede, Incendio, Emergenza..."
                value={formData.destination}
                onChange={(e) => setFormData({...formData, destination: e.target.value})}
                required
              />
            </div>
          </>
        ) : (
          <>
            <div className="bg-blue-900 p-4 rounded-2xl text-white mb-4 flex justify-between items-center">
               <div>
                  <p className="text-[10px] opacity-70 uppercase font-black">Mezzo</p>
                  <p className="text-xl font-black">{vehicles.find(v => v.id === activeTrip.vehicleId)?.plate}</p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] opacity-70 uppercase font-black">Partenza</p>
                  <p className="text-lg font-black">{activeTrip.startKm} KM</p>
               </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">KM al Rientro</label>
              <input
                type="number"
                inputMode="numeric"
                className="w-full rounded-xl border-2 border-blue-500 p-4 mt-1 text-3xl font-black text-blue-900 focus:ring-4 focus:ring-blue-100 outline-none"
                value={formData.endKm}
                onChange={(e) => setFormData({...formData, endKm: e.target.value})}
                min={activeTrip.startKm}
                required
              />
            </div>
          </>
        )}

        <div className="space-y-3 pt-2">
            <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${formData.refuelingDone ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-100'}`} onClick={() => setFormData({...formData, refuelingDone: !formData.refuelingDone})}>
                <input 
                    type="checkbox" 
                    className="w-6 h-6 rounded-lg text-yellow-500" 
                    checked={formData.refuelingDone}
                    onChange={(e) => setFormData({...formData, refuelingDone: e.target.checked})}
                />
                <label className="text-sm font-black text-gray-700 uppercase">Fatto Rifornimento</label>
            </div>

            {isEnding && (
              <div className="pt-2">
                <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${formData.maintenanceNeeded ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-100'}`} onClick={() => setFormData({...formData, maintenanceNeeded: !formData.maintenanceNeeded})}>
                    <input 
                        type="checkbox" 
                        className="w-6 h-6 rounded-lg text-red-500" 
                        checked={formData.maintenanceNeeded}
                        readOnly
                    />
                    <label className="text-sm font-black text-red-600 uppercase">Segnala Guasto</label>
                </div>
                {formData.maintenanceNeeded && (
                    <textarea 
                        className="w-full mt-2 rounded-xl border border-red-200 p-3 text-sm bg-red-50 animate-in fade-in"
                        placeholder="Descrivi brevemente il problema riscontrato..."
                        value={formData.maintenanceDescription}
                        onChange={(e) => setFormData({...formData, maintenanceDescription: e.target.value})}
                        required
                    />
                )}
              </div>
            )}
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Note di Servizio</label>
          <textarea
            className="w-full rounded-xl border border-gray-200 p-3 mt-1 text-sm"
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Eventuali note aggiuntive..."
          />
        </div>
      </div>

      <button
        type="submit"
        className={`w-full py-5 rounded-2xl text-white font-black text-xl shadow-2xl transform active:scale-95 transition-all ${isEnding ? 'bg-green-600' : 'bg-blue-600'}`}
      >
        {isEnding ? 'CHIUDI MISSIONE' : 'AVVIA MISSIONE'}
      </button>
    </form>
  );
};

export default TripForm;
