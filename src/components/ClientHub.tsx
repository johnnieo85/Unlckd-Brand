import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  FileText, 
  Utensils, 
  Activity, 
  CheckCircle2, 
  ShieldAlert, 
  ChevronRight,
  Send,
  Eye,
  UserCheck
} from 'lucide-react';
import { Card, Badge } from './ui/Card';
import { Button } from './ui/Button';
import { UserProfile, SavedReport } from '../types';
import { cn } from '../lib/utils';

interface ClientHubProps {
  userProfile: UserProfile | null;
  onProfileUpdate: () => void;
  onSyncToGymHub?: (report: SavedReport) => void;
}

export interface ClientData {
  id: string;
  name: string;
  email: string;
  dietType: string;
  status: 'Active - Compliant' | 'Needs Meal Plan Sync' | 'Physique Assessed' | '3 Days Active';
  lastActive: string;
  avatar: string;
  reports: {
    id: string;
    type: 'full' | 'meal' | 'assessment';
    title: string;
    date: string;
    summary: string;
    syncedToGymHub: boolean;
  }[];
}

const SAMPLE_CLIENTS: ClientData[] = [
  {
    id: 'client-1',
    name: 'Marcus Vance',
    email: 'marcus.v@example.com',
    dietType: 'High Protein Keto',
    status: 'Active - Compliant',
    lastActive: '2 hours ago',
    avatar: 'MV',
    reports: [
      {
        id: 'rep-101',
        type: 'full',
        title: 'Full 12-Week Lean Recomp Protocol',
        date: '2026-08-01',
        summary: 'Target 2,400 kcal, 210g protein, 5-day hyper-trophy split.',
        syncedToGymHub: true,
      },
      {
        id: 'rep-102',
        type: 'meal',
        title: 'High Protein Keto Meal Blueprint',
        date: '2026-08-03',
        summary: '4 meals/day focusing on salmon, steak, eggs, and avocado.',
        syncedToGymHub: false,
      },
      {
        id: 'rep-103',
        type: 'assessment',
        title: 'Physique Scan & Body Fat Evaluation',
        date: '2026-08-05',
        summary: 'Estimated 14.2% body fat, upper body symmetry priority.',
        syncedToGymHub: false,
      }
    ]
  },
  {
    id: 'client-2',
    name: 'Elena Rostova',
    email: 'elena.r@example.com',
    dietType: 'Carb Cycling & Clean Bulking',
    status: 'Needs Meal Plan Sync',
    lastActive: '1 day ago',
    avatar: 'ER',
    reports: [
      {
        id: 'rep-201',
        type: 'meal',
        title: 'Carb Cycling Peak Prep Plan',
        date: '2026-08-04',
        summary: 'High carb on leg days (300g), low carb on rest days (100g).',
        syncedToGymHub: false,
      },
      {
        id: 'rep-202',
        type: 'assessment',
        title: 'Pre-Competition Physique Audit',
        date: '2026-08-02',
        summary: 'Posterior chain focus, glute/hamstring tie-in notes.',
        syncedToGymHub: false,
      }
    ]
  },
  {
    id: 'client-3',
    name: 'David Chen',
    email: 'd.chen@example.com',
    dietType: 'Balanced Macro Maintenance',
    status: 'Physique Assessed',
    lastActive: '3 hours ago',
    avatar: 'DC',
    reports: [
      {
        id: 'rep-301',
        type: 'full',
        title: '4-Week Athletic Conditioning Protocol',
        date: '2026-07-28',
        summary: 'Functional hypertrophy + sprint intervals.',
        syncedToGymHub: true,
      },
      {
        id: 'rep-302',
        type: 'assessment',
        title: 'Mid-Year Physique Symmetry Check',
        date: '2026-08-06',
        summary: 'Shoulder-to-waist ratio improved by 3.8%.',
        syncedToGymHub: false,
      }
    ]
  }
];

export const ClientHub: React.FC<ClientHubProps> = ({
  userProfile,
  onProfileUpdate,
  onSyncToGymHub
}) => {
  const isTrainer = userProfile?.membershipTier === 'trainer';
  const [selectedClient, setSelectedClient] = useState<ClientData>(SAMPLE_CLIENTS[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncStatusMap, setSyncStatusMap] = useState<Record<string, boolean>>({});

  const filteredClients = SAMPLE_CLIENTS.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.dietType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSyncReport = (report: ClientData['reports'][0]) => {
    if (report.type === 'assessment') {
      alert('Physique Assessment reports are view-only and cannot be synced to Gym Hub.');
      return;
    }
    setSyncStatusMap(prev => ({ ...prev, [report.id]: true }));
  };

  // Access check: If user is not trainer tier
  if (!isTrainer) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="p-8 bg-brand-surface border-amber-400/30 text-center space-y-6">
          <div className="w-16 h-16 bg-amber-400/10 border border-amber-400/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl font-display font-black text-white">Trainer Tier Required</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              The <strong>Client Hub</strong> is an exclusive suite for certified coaches and trainers to oversee client rosters, review report histories, and push meal/workout plans directly to client Gym Hubs.
            </p>
          </div>

          <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl max-w-md mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300">Upgrade to Trainer Membership</span>
              <Button
                size="sm"
                onClick={async () => {
                  if (userProfile?.userId) {
                    const { updateUserProfile } = await import('../services/accessService');
                    await updateUserProfile(userProfile.userId, { membershipTier: 'trainer' });
                    onProfileUpdate();
                  }
                }}
                className="bg-amber-400 text-brand-dark font-black text-xs hover:bg-amber-300"
              >
                Enable Trainer Tier
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-surface border border-white/10 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-xl">
            <Users className="w-6 h-6 text-brand-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-black text-white">Client Hub</h1>
              <Badge className="bg-amber-400/20 text-amber-400 border-amber-400/40 text-[9px] font-black uppercase">
                Pro Trainer Tier
              </Badge>
            </div>
            <p className="text-xs text-gray-400">Manage client rosters, diet protocols, and sync reports to client Gym Hubs</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter clients or diet types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:border-brand-primary outline-none"
          />
        </div>
      </div>

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Client List */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 px-1">Active Client Roster</h3>
          <div className="space-y-3">
            {filteredClients.map((client) => {
              const isSelected = selectedClient.id === client.id;
              return (
                <Card
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={cn(
                    "p-4 cursor-pointer transition-all border group",
                    isSelected 
                      ? "bg-brand-primary/10 border-brand-primary/50 shadow-lg" 
                      : "bg-brand-surface border-white/5 hover:border-white/20"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black text-xs text-brand-primary border border-white/10">
                        {client.avatar}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-brand-primary transition-colors">{client.name}</h4>
                        <p className="text-[11px] text-gray-400">{client.dietType}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white" />
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[10px]">
                    <span className="font-mono text-emerald-400 font-bold">{client.status}</span>
                    <span className="text-gray-500">{client.lastActive}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Client Details & Report History */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 bg-brand-surface border-white/10 space-y-6">
            {/* Selected Client Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center font-black text-sm text-brand-primary">
                  {selectedClient.avatar}
                </div>
                <div>
                  <h3 className="text-xl font-display font-black text-white">{selectedClient.name}</h3>
                  <p className="text-xs text-gray-400">{selectedClient.email} • Protocol: <strong className="text-brand-primary">{selectedClient.dietType}</strong></p>
                </div>
              </div>

              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                {selectedClient.status}
              </Badge>
            </div>

            {/* Reports Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary">Client Report History</h4>

              <div className="space-y-4">
                {selectedClient.reports.map((report) => {
                  const isSynced = syncStatusMap[report.id] || report.syncedToGymHub;
                  const isAssessment = report.type === 'assessment';

                  return (
                    <div
                      key={report.id}
                      className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {report.type === 'full' && <FileText className="w-4 h-4 text-brand-primary shrink-0" />}
                          {report.type === 'meal' && <Utensils className="w-4 h-4 text-emerald-400 shrink-0" />}
                          {report.type === 'assessment' && <Activity className="w-4 h-4 text-amber-400 shrink-0" />}
                          <div>
                            <h5 className="text-sm font-bold text-white">{report.title}</h5>
                            <p className="text-[10px] text-gray-500 font-mono">Generated on {report.date}</p>
                          </div>
                        </div>

                        {/* Report Type Badge */}
                        <Badge className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5",
                          report.type === 'full' && "bg-brand-primary/10 text-brand-primary border-brand-primary/20",
                          report.type === 'meal' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                          report.type === 'assessment' && "bg-amber-400/10 text-amber-400 border-amber-400/20"
                        )}>
                          {report.type === 'full' ? 'Full Transformation' : report.type === 'meal' ? 'Meal Plan' : 'Physique Scan'}
                        </Badge>
                      </div>

                      <p className="text-xs text-gray-300 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">
                        {report.summary}
                      </p>

                      {/* Sync to Client's Gym Hub Action Bar */}
                      <div className="pt-2 flex items-center justify-between border-t border-white/5">
                        {isAssessment ? (
                          /* Physique Assessment is explicitly NOT syncable */
                          <div className="flex items-center gap-2 text-amber-400/80 text-[11px] font-mono font-bold bg-amber-400/5 px-3 py-1.5 rounded-xl border border-amber-400/20 w-full">
                            <Eye className="w-3.5 h-3.5 shrink-0" />
                            <span>View-Only Report • Physique Scans Cannot Sync to Gym Hub</span>
                          </div>
                        ) : (
                          /* Full Transformation & Meal Plan are Syncable */
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[10px] text-gray-400 font-mono">
                              {isSynced ? '✓ Synced to Client Gym Hub' : 'Ready to deploy to client Gym Hub'}
                            </span>
                            <Button
                              size="sm"
                              disabled={isSynced}
                              onClick={() => handleSyncReport(report)}
                              className={cn(
                                "gap-1.5 font-black text-xs uppercase px-4 py-1.5 transition-all",
                                isSynced
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-brand-primary text-brand-dark hover:bg-brand-primary/90"
                              )}
                            >
                              {isSynced ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Synced to Gym Hub
                                </>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5" /> Sync to Client's Gym Hub
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
