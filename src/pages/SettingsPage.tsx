import React, { useState, useEffect } from 'react';
import { Settings, Save, Database, Download, Upload, Loader2, Globe, Shield, Bell, Check } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [saved, setSaved] = useState(false);
  const { tenant } = useAuthStore();
  
  const [settings, setSettings] = useState({
    shopName: tenant?.shopName || '',
    slug: tenant?.slug || '',
    gstin: tenant?.gstin || '',
    state: tenant?.state || '',
    businessType: tenant?.businessType || 'B2C'
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/settings/tenant', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get('/backup/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_${tenant?.id}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Export failed');
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('This will OVERWRITE your current data with the backup. Proceed?')) return;

    setRestoring(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const backupData = JSON.parse(event.target?.result as string);
          await api.post('/backup/restore', backupData);
          alert('Restore successful! Please refresh the page.');
          window.location.reload();
        } catch (err) {
          alert('Invalid backup file');
        }
      };
      reader.readAsText(file);
    } catch (err) {
      alert('Restore failed');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          Business Settings
          <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
        </h2>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Configure your digital storefront</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
         {/* Left: General Settings */}
         <div className="lg:col-span-2 space-y-8">
            <div className="glass-card p-10">
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-10 flex items-center gap-3">
                  <Globe className="w-5 h-5 text-indigo-500" />
                  Store Identity
               </h3>
               <form onSubmit={handleSave} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Shop Name</label>
                        <input 
                           type="text" 
                           value={settings.shopName}
                           onChange={e => setSettings({...settings, shopName: e.target.value})}
                           className="input-base w-full h-14" 
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Public URL Slug</label>
                        <input 
                           type="text" 
                           value={settings.slug}
                           onChange={e => setSettings({...settings, slug: e.target.value})}
                           placeholder="e.g. ravi-stores"
                           className="input-base w-full h-14" 
                        />
                        <p className="text-[9px] text-slate-400 mt-2 italic">Your catalogue: /store/{settings.slug || 'slug'}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">GSTIN Number</label>
                        <input 
                           type="text" 
                           value={settings.gstin}
                           onChange={e => setSettings({...settings, gstin: e.target.value})}
                           className="input-base w-full h-14" 
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Business State</label>
                        <input 
                           type="text" 
                           value={settings.state}
                           onChange={e => setSettings({...settings, state: e.target.value})}
                           className="input-base w-full h-14" 
                        />
                     </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                     <div className="flex items-center gap-3">
                         {saved && (
                             <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase">
                                 <Check className="w-4 h-4" /> Changes Applied
                             </motion.div>
                         )}
                     </div>
                     <button 
                        type="submit" 
                        disabled={loading}
                        className="bg-brand text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-3 disabled:opacity-50"
                     >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Persist Changes
                     </button>
                  </div>
               </form>
            </div>
         </div>

         {/* Right: Data Management */}
         <div className="space-y-8">
            <div className="glass-card p-10 bg-slate-900 text-white">
               <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                  <Database className="w-5 h-5 text-emerald-400" />
                  Cloud Backup
               </h3>
               <p className="text-xs text-slate-400 font-medium leading-relaxed mb-10">Export your entire store data into a portable JSON file. Keep it safe for disaster recovery.</p>
               
               <button 
                 onClick={handleExport}
                 className="w-full bg-white text-slate-900 h-16 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 mb-4"
               >
                  <Download className="w-5 h-5" /> Export Data Packet
               </button>

               <div className="relative">
                  <input 
                    type="file" 
                    accept=".json"
                    onChange={handleRestore}
                    disabled={restoring}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                  />
                  <div className="w-full bg-slate-800 text-slate-300 h-16 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-700 flex items-center justify-center gap-3">
                     {restoring ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                     Restore from File
                  </div>
               </div>
            </div>

            <div className="glass-card p-8 bg-amber-50 border-amber-100">
               <div className="flex gap-4">
                  <Shield className="w-5 h-5 text-amber-600 mt-1" />
                  <div>
                     <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Security Advisory</p>
                     <p className="text-xs text-amber-800 font-medium mt-2 leading-relaxed italic">Restoring from a backup will replace all current invoices, inventory and ledgers with the file data. This action cannot be undone.</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
