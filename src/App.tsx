/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
  Upload, 
  RotateCcw, 
  Download, 
  Trash2, 
  FileText, 
  Search, 
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HAREntry } from './types';
import { BusinessPolicy, parseTagAssistantJson } from './lib/logic';
import { cn } from './lib/utils';

const INITIAL_FILTERS = {
  seq: '',
  ecsid: '',
  ecMode: '',
  em: '',
  label: '',
  eventType: 'Conversion|UPDE',
  error: '',
  method: '',
  url: '',
  status: '',
  time: '',
};

const INITIAL_REGEX_STATES = {
  seq: false,
  ecsid: false,
  ecMode: false,
  em: false,
  label: false,
  eventType: true,
  error: false,
  method: false,
  url: false,
  status: false,
  time: false,
};

export default function App() {
  const [allEntries, setAllEntries] = useState<HAREntry[]>([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [regexStates, setRegexStates] = useState(INITIAL_REGEX_STATES);
  const [activeEmParam, setActiveEmParam] = useState<'em' | 'eme'>('em');
  const [analysisInfo, setAnalysisInfo] = useState<{ type: string; time: string } | null>(null);
  const [status, setStatus] = useState('Ready');
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setStatus(`Loading ${file.name}...`);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      
      let entries: HAREntry[] = [];
      let type = '';

      if (json.log && json.log.entries) {
        entries = json.log.entries;
        type = 'HAR File';
      } else if (json.data && json.data.containers) {
        entries = parseTagAssistantJson(json);
        type = 'Tag Assistant';
      } else {
        throw new Error('Unsupported file format');
      }

      if (entries.length === 0) {
        throw new Error('No valid entries found in file');
      }

      const processedEntries = entries.map((entry, index) => {
        const urlStr = entry.request.url;
        
        let em = entry._em;
        let eme = entry._eme;
        let label = entry._label;
        let ecsid = entry._ecsid;
        let ecMode = entry._ecMode;
        let eventType = entry._eventType;

        if (em === undefined) {
          eventType = BusinessPolicy.getEventType(urlStr);
          try {
            const url = new URL(urlStr);
            em = url.searchParams.get('em') || '';
            eme = url.searchParams.get('eme') || '';
            label = url.searchParams.get('label') || '';
            ecsid = url.searchParams.get('ecsid') || '';
            ecMode = url.searchParams.get('ec_mode') || '';
          } catch {
            const parts = urlStr.split('?');
            const search = parts[1];
            if (search) {
              const params = new URLSearchParams(search);
              em = params.get('em') || '';
              eme = params.get('eme') || '';
              label = params.get('label') || '';
              ecsid = params.get('ecsid') || '';
              ecMode = params.get('ec_mode') || '';
            }
          }
        }
        
        const activeVal = activeEmParam === 'em' ? em : eme;
        
        return {
          ...entry,
          _id: `entry-${index}`,
          _seq: index + 1,
          _em: em || '',
          _eme: eme || '',
          _label: label || '',
          _ecsid: ecsid || '',
          _ecMode: ecMode || '',
          _eventType: eventType || 'other',
          _errorDescription: BusinessPolicy.getErrorDescription(activeVal || '', entry.response.status)
        };
      }).sort((a, b) => (b._seq || 0) - (a._seq || 0));

      setAllEntries(processedEntries);
      setAnalysisInfo({ type, time: new Date().toLocaleString() });
      setStatus(`Loaded: ${file.name}`);
    } catch (error) {
      console.error(error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      alert(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [activeEmParam]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const filteredEntries = useMemo(() => {
    return allEntries.filter(entry => {
      const emValue = activeEmParam === 'em' ? entry._em : entry._eme;
      const currentError = BusinessPolicy.getErrorDescription(emValue || '', entry.response.status);

      const checks = [
        { val: entry._seq?.toString() || '', filter: filters.seq, regex: regexStates.seq },
        { val: entry._ecsid || '', filter: filters.ecsid, regex: regexStates.ecsid },
        { val: entry._ecMode || '', filter: filters.ecMode, regex: regexStates.ecMode },
        { val: emValue, filter: filters.em, regex: regexStates.em },
        { val: entry._label || '', filter: filters.label, regex: regexStates.label },
        { val: entry._eventType || '', filter: filters.eventType, regex: regexStates.eventType },
        { val: currentError, filter: filters.error, regex: regexStates.error },
        { val: entry.request.method, filter: filters.method, regex: regexStates.method },
        { val: entry.request.url, filter: filters.url, regex: regexStates.url },
        { val: entry.response.status.toString(), filter: filters.status, regex: regexStates.status },
        { val: entry.time.toString(), filter: filters.time, regex: regexStates.time },
      ];

      return checks.every(({ val, filter, regex }) => {
        if (!filter) return true;
        try {
          if (regex) {
            const re = new RegExp(filter, 'i');
            return re.test(val || '');
          }
          return (val || '').toLowerCase().includes(filter.toLowerCase());
        } catch {
          return false;
        }
      });
    });
  }, [allEntries, filters, regexStates, activeEmParam]);

  const exportCsv = useCallback(() => {
    if (filteredEntries.length === 0) return;
    
    const headers = ['Seq', 'ecsid', 'ec_mode', activeEmParam.toUpperCase(), 'Label', 'Event Type', 'Error', 'Method', 'URL', 'Status', 'Time'];
    const rows = filteredEntries.map(e => {
      const emValue = activeEmParam === 'em' ? e._em : e._eme;
      const currentError = BusinessPolicy.getErrorDescription(emValue || '', e.response.status);
      
      return [
        e._seq,
        e._ecsid,
        e._ecMode,
        emValue,
        e._label,
        e._eventType,
        currentError,
        e.request.method,
        e.request.url,
        e.response.status,
        e.time
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tag_analysis_${new Date().getTime()}.csv`);
    link.click();
  }, [filteredEntries, activeEmParam]);

  const clear = () => {
    setAllEntries([]);
    setAnalysisInfo(null);
    setStatus('Ready');
    setFilters(INITIAL_FILTERS);
    setRegexStates(INITIAL_REGEX_STATES);
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setRegexStates(INITIAL_REGEX_STATES);
  };

  const toggleRegex = (key: keyof typeof INITIAL_REGEX_STATES) => {
    setRegexStates(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateFilter = (key: keyof typeof INITIAL_FILTERS, val: string) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-[#141414] p-4 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="font-serif italic text-xl font-bold tracking-tight">Tag Analyzer</h1>
          <span className="text-[10px] font-mono opacity-50 uppercase tracking-widest border border-[#141414]/20 px-1.5 py-0.5 rounded">v1.2.0</span>
          
          <AnimatePresence>
            {analysisInfo && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-2 ml-4 px-3 py-1 bg-[#141414]/5 rounded-full border border-[#141414]/10"
              >
                <span className="text-[10px] font-bold uppercase tracking-tighter opacity-70">{analysisInfo.type}</span>
                <span className="w-1 h-1 bg-[#141414]/20 rounded-full"></span>
                <span className="text-[10px] font-mono opacity-50">{analysisInfo.time}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-2">
          <label className="cursor-pointer bg-[#141414] text-[#E4E3E0] px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
            <Upload size={16} />
            Upload File
            <input 
              type="file" 
              accept=".har,.json" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
          
          {allEntries.length > 0 && (
            <>
              <button 
                onClick={resetFilters}
                className="border border-[#141414] px-4 py-2 text-sm font-medium hover:bg-[#141414] hover:text-[#E4E3E0] transition-all flex items-center gap-2"
              >
                <RotateCcw size={16} />
                Reset Filters
              </button>
              <button 
                onClick={exportCsv}
                className="border border-[#141414] px-4 py-2 text-sm font-medium hover:bg-[#141414] hover:text-[#E4E3E0] transition-all flex items-center gap-2"
              >
                <Download size={16} />
                Export CSV
              </button>
              <button 
                onClick={clear}
                className="border border-[#141414] px-4 py-2 text-sm font-medium hover:bg-[#141414] hover:text-[#E4E3E0] transition-all flex items-center gap-2"
              >
                <Trash2 size={16} />
                Clear
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {allEntries.length === 0 ? (
          <div 
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={cn(
              "flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed m-4 rounded-xl transition-all duration-300",
              isDragging ? "border-[#141414] bg-[#141414]/5 scale-[0.99]" : "border-[#141414]/20"
            )}
          >
            <div className="text-center space-y-4 max-w-md">
              <motion.div 
                animate={isDragging ? { y: [0, -10, 0] } : {}}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-16 h-16 bg-[#141414]/5 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <FileText size={32} className="opacity-40" />
              </motion.div>
              <h2 className="text-2xl font-serif italic">Analyze your tracking data</h2>
              <p className="text-sm opacity-60">Drag and drop a .har or Tag Assistant .json file here, or use the upload button above. Your data stays in your browser and is never uploaded to a server.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto bg-white/30 m-4 border border-[#141414] rounded-lg shadow-sm">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-20 bg-[#141414] text-[#E4E3E0] font-serif italic">
                  <tr>
                    <FilterHeader 
                      label="Seq" 
                      id="seq" 
                      width="w-16" 
                      placeholder="#"
                      filter={filters.seq}
                      isRegex={regexStates.seq}
                      onFilterChange={(v) => updateFilter('seq', v)}
                      onToggleRegex={() => toggleRegex('seq')}
                    />
                    <FilterHeader 
                      label="ecsid" 
                      id="ecsid" 
                      width="w-32" 
                      placeholder="ecsid..."
                      filter={filters.ecsid}
                      isRegex={regexStates.ecsid}
                      onFilterChange={(v) => updateFilter('ecsid', v)}
                      onToggleRegex={() => toggleRegex('ecsid')}
                    />
                    <FilterHeader 
                      label="ec_mode" 
                      id="ecMode" 
                      width="w-32" 
                      placeholder="ec_mode..."
                      filter={filters.ecMode}
                      isRegex={regexStates.ecMode}
                      onFilterChange={(v) => updateFilter('ecMode', v)}
                      onToggleRegex={() => toggleRegex('ecMode')}
                    />
                    <th className="p-3 border-b border-[#141414] w-32">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="whitespace-nowrap">{activeEmParam.toUpperCase()} Value</span>
                            <button 
                              onClick={() => setActiveEmParam(prev => prev === 'em' ? 'eme' : 'em')}
                              title="Switch between em and eme" 
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/30 text-amber-200 transition-all active:scale-95 shadow-sm cursor-pointer"
                            >
                              <ArrowUpDown size={12} strokeWidth={2.5} />
                              <span className="text-[9px] font-bold uppercase tracking-wider">Switch</span>
                            </button>
                          </div>
                          <button 
                            onClick={() => toggleRegex('em')}
                            className={cn(
                              "text-[10px] px-1 rounded transition-colors",
                              regexStates.em ? "bg-white/30 opacity-100" : "hover:bg-white/20 opacity-50"
                            )}
                          >
                            .*
                          </button>
                        </div>
                        <input 
                          type="text" 
                          placeholder={`${activeEmParam}...`}
                          value={filters.em}
                          onChange={(e) => updateFilter('em', e.target.value)}
                          className="w-full bg-white/10 border border-white/20 px-1 py-0.5 text-[10px] font-mono focus:outline-none focus:border-white/50" 
                        />
                      </div>
                    </th>
                    <FilterHeader 
                      label="Label" 
                      id="label" 
                      width="w-32" 
                      placeholder="label..."
                      filter={filters.label}
                      isRegex={regexStates.label}
                      onFilterChange={(v) => updateFilter('label', v)}
                      onToggleRegex={() => toggleRegex('label')}
                    />
                    <FilterHeader 
                      label="Event Type" 
                      id="eventType" 
                      width="w-32" 
                      placeholder="Event..."
                      filter={filters.eventType}
                      isRegex={regexStates.eventType}
                      onFilterChange={(v) => updateFilter('eventType', v)}
                      onToggleRegex={() => toggleRegex('eventType')}
                    />
                    <FilterHeader 
                      label="Error" 
                      id="error" 
                      width="w-40" 
                      placeholder="Error..."
                      filter={filters.error}
                      isRegex={regexStates.error}
                      onFilterChange={(v) => updateFilter('error', v)}
                      onToggleRegex={() => toggleRegex('error')}
                    />
                    <FilterHeader 
                      label="Method" 
                      id="method" 
                      width="w-20" 
                      placeholder="GET"
                      filter={filters.method}
                      isRegex={regexStates.method}
                      onFilterChange={(v) => updateFilter('method', v)}
                      onToggleRegex={() => toggleRegex('method')}
                    />
                    <FilterHeader 
                      label="URL" 
                      id="url" 
                      placeholder="Filter URL..."
                      filter={filters.url}
                      isRegex={regexStates.url}
                      onFilterChange={(v) => updateFilter('url', v)}
                      onToggleRegex={() => toggleRegex('url')}
                    />
                    <FilterHeader 
                      label="Status" 
                      id="status" 
                      width="w-20" 
                      placeholder="200"
                      filter={filters.status}
                      isRegex={regexStates.status}
                      onFilterChange={(v) => updateFilter('status', v)}
                      onToggleRegex={() => toggleRegex('status')}
                    />
                    <FilterHeader 
                      label="Time" 
                      id="time" 
                      width="w-20" 
                      placeholder="ms"
                      align="right"
                      filter={filters.time}
                      isRegex={regexStates.time}
                      onFilterChange={(v) => updateFilter('time', v)}
                      onToggleRegex={() => toggleRegex('time')}
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141414]/10">
                  {filteredEntries.map((entry) => (
                    <EntryRow 
                      key={entry._id} 
                      entry={entry} 
                      activeEmParam={activeEmParam} 
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#141414] p-2 px-4 flex justify-between items-center text-[10px] font-mono opacity-60 bg-white/50">
        <div>{status}</div>
        <div>{filteredEntries.length} / {allEntries.length} Requests</div>
      </footer>
    </div>
  );
}

function FilterHeader({ 
  label, 
  width, 
  placeholder, 
  filter, 
  isRegex, 
  onFilterChange, 
  onToggleRegex,
  align = 'left'
}: { 
  label: string; 
  id?: string;
  width?: string; 
  placeholder: string;
  filter: string;
  isRegex: boolean;
  onFilterChange: (v: string) => void;
  onToggleRegex: () => void;
  align?: 'left' | 'right';
}) {
  return (
    <th className={cn("p-3 border-b border-[#141414]", width, align === 'right' && "text-right")}>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span>{label}</span>
          <button 
            onClick={onToggleRegex}
            className={cn(
              "text-[10px] px-1 rounded transition-colors",
              isRegex ? "bg-white/30 opacity-100" : "hover:bg-white/20 opacity-50"
            )}
          >
            .*
          </button>
        </div>
        <input 
          type="text" 
          placeholder={placeholder}
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          className={cn(
            "w-full bg-white/10 border border-white/20 px-1 py-0.5 text-[10px] font-mono focus:outline-none focus:border-white/50",
            align === 'right' && "text-right"
          )}
        />
      </div>
    </th>
  );
}

interface EntryRowProps {
  key?: string | number;
  entry: HAREntry;
  activeEmParam: 'em' | 'eme';
}

function EntryRow({ entry, activeEmParam }: EntryRowProps) {
  const emValue = activeEmParam === 'em' ? entry._em : entry._eme;
  const currentError = BusinessPolicy.getErrorDescription(emValue || '', entry.response.status);
  const isError = !!currentError;

  // Color mapping functions (simplified for brevity, can be expanded)
  const getEcsidColor = (id: string) => {
    if (!id) return '';
    const colors = ['bg-blue-100 text-blue-800', 'bg-purple-100 text-purple-800', 'bg-indigo-100 text-indigo-800', 'bg-cyan-100 text-cyan-800', 'bg-teal-100 text-teal-800'];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <tr className={cn(
      "hover:bg-[#141414]/5 transition-colors group",
      isError && "bg-rose-100/50 hover:bg-rose-200/50"
    )}>
      <td className="p-3 font-mono opacity-50">{entry._seq}</td>
      <td className="p-3">
        {entry._ecsid && (
          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-medium", getEcsidColor(entry._ecsid))}>
            {entry._ecsid}
          </span>
        )}
      </td>
      <td className="p-3">
        {entry._ecMode && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-violet-100 text-violet-800">
            {entry._ecMode}
          </span>
        )}
      </td>
      <td className="p-3 max-w-[120px]">
        {emValue && (
          <div 
            title={emValue}
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold truncate",
              BusinessPolicy.isEmError(emValue) 
                ? "bg-rose-600 text-white" 
                : "bg-amber-100 text-amber-800"
            )}
          >
            {emValue}
          </div>
        )}
      </td>
      <td className="p-3">
        {entry._label && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-100 text-emerald-800">
            {entry._label}
          </span>
        )}
      </td>
      <td className="p-3">
        <span className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter",
          entry._eventType === 'Conversion' ? "bg-purple-600 text-white" :
          entry._eventType === 'UPDE' ? "bg-blue-600 text-white" :
          "bg-gray-200 text-gray-600"
        )}>
          {entry._eventType}
        </span>
      </td>
      <td className="p-3">
        {currentError && (
          <div className="flex items-center gap-1 text-rose-600 font-medium">
            <AlertCircle size={12} />
            {currentError}
          </div>
        )}
      </td>
      <td className="p-3 font-mono opacity-50">{entry.request.method}</td>
      <td className="p-3">
        <div className="max-w-md truncate opacity-70 hover:opacity-100 transition-opacity" title={entry.request.url}>
          {entry.request.url}
        </div>
      </td>
      <td className="p-3">
        <span className={cn(
          "font-mono font-bold",
          entry.response.status >= 400 ? "text-rose-600" : "text-emerald-600"
        )}>
          {entry.response.status}
        </span>
      </td>
      <td className="p-3 text-right font-mono opacity-50">{entry.time}ms</td>
    </tr>
  );
}
