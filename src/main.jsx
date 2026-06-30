import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bolt,
  Briefcase,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Gauge,
  History,
  IndianRupee,
  KeyRound,
  LineChart,
  LogOut,
  MonitorDot,
  Play,
  PlugZap,
  Plus,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  Square,
  Search,
  Target,
  TrendingDown,
  Trash2,
  TrendingUp,
  User,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_BASE || 'https://algoapi.foodcrisis.in';
const apiCache = new Map();

function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('algo.session') || 'null'));
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const brokerStatus = params.get('brokerStatus');
    if (!brokerStatus) return;
    const message = params.get('message') || (brokerStatus === 'connected' ? 'Broker connected successfully.' : 'Broker connection failed.');
    setNotice(message);
    params.delete('brokerStatus');
    params.delete('role');
    params.delete('message');
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', next);
  }, []);

  const login = async (mobile, name) => {
    const res = await api('/api/login', { method: 'POST', body: { mobile, name } });
    const next = res.data;
    localStorage.setItem('algo.session', JSON.stringify(next));
    setSession(next);
  };

  const logout = () => {
    localStorage.removeItem('algo.session');
    setSession(null);
  };

  if (!session) return <Login onLogin={login} notice={notice} setNotice={setNotice} />;
  return session.role === 'admin'
    ? <AdminApp session={session} logout={logout} notice={notice} setNotice={setNotice} />
    : <UserApp session={session} logout={logout} notice={notice} setNotice={setNotice} />;
}

function Login({ onLogin, notice, setNotice }) {
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onLogin(mobile, name);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="loginShell">
      <form className="loginPanel" onSubmit={submit}>
        <div className="brandMark"><Bolt size={22} /><strong>AlgoBot</strong></div>
        <h1>Welcome Back</h1>
        <p>Secure access to your strategy subscriptions, broker connection, and trade history.</p>
        <input inputMode="numeric" placeholder="Mobile number" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} />
        <input placeholder="Name, optional" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="primary" disabled={mobile.length < 10 || busy}><KeyRound size={16} />Continue</button>
        {notice && <div className="notice">{notice}</div>}
      </form>
    </main>
  );
}

function UserApp({ session, logout, notice, setNotice }) {
  const mobile = session.user.mobile;
  const [tab, setTab] = useState('dashboard');
  const [details, setDetails] = useState(null);
  const [brokers, setBrokers] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [settings, setSettings] = useState({});
  const [trades, setTrades] = useState([]);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null);

  const refresh = async () => {
    setBusy(true);
    try {
      const [detailRes, brokerRes, strategyRes, tradeRes, settingsRes] = await settleApi([
        api(`/api/users/${mobile}`),
        api(`/api/users/${mobile}/brokers`),
        api(`/api/users/${mobile}/strategies`),
        api(`/api/admin/trades?mobile=${mobile}`),
        api('/api/admin/settings'),
      ]);
      if (detailRes.ok) setDetails(detailRes.data);
      if (brokerRes.ok) setBrokers(brokerRes.data || []);
      if (strategyRes.ok) setStrategies(strategyRes.data || []);
      if (tradeRes.ok) setTrades(tradeRes.data || []);
      if (settingsRes.ok) setSettings(settingsRes.data || {});
      const failed = [detailRes, brokerRes, strategyRes, tradeRes, settingsRes].find((item) => !item.ok);
      if (failed) setNotice(failed.error);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const loadHistory = async () => {
    const res = await api(`/api/login-history?mobile=${mobile}&limit=20`);
    setHistory(res.data || []);
    setModal('history');
  };

  const activeBroker = brokers.find((item) => item.is_active);
  const instance = details?.instance || { status: 'stopped' };

  return (
    <Shell
      title="Algo Trading"
      subtitle={notice || `Last login: ${session.lastLoginAt || 'first login'}`}
      nav={[
        ['dashboard', Gauge, 'Dashboard'],
        ['broker', Briefcase, 'Broker'],
        ['strategy', TrendingUp, 'Strategy'],
        ['trades', Activity, 'Trades'],
      ]}
      active={tab}
      setActive={setTab}
      refresh={refresh}
      busy={busy}
      logout={logout}
    >
      {tab === 'dashboard' && (
        <UserDashboard
          mobile={mobile}
          details={details}
          activeBroker={activeBroker}
          brokers={brokers}
          instance={instance}
          strategies={strategies}
          trades={trades}
          setTab={setTab}
          refresh={refresh}
          setNotice={setNotice}
          loadHistory={loadHistory}
        />
      )}
      {tab === 'broker' && <UserBrokers mobile={mobile} brokers={brokers} settings={settings} refresh={refresh} setNotice={setNotice} />}
      {tab === 'strategy' && <UserStrategies mobile={mobile} strategies={strategies} refresh={refresh} setNotice={setNotice} />}
      {tab === 'trades' && <TradeCards trades={trades} mobile={mobile} setTrades={setTrades} setNotice={setNotice} />}
      {modal === 'history' && <Modal title="Last 20 Logins" onClose={() => setModal(null)}><DataTable rows={history} columns={['created_at', 'mobile', 'role', 'status', 'message']} /></Modal>}
    </Shell>
  );
}

function UserDashboard({ mobile, details, activeBroker, brokers, instance, strategies = [], trades = [], setTab, refresh, setNotice, loadHistory }) {
  const startStop = async (action) => {
    try {
      await api(`/api/users/${mobile}/${action}`, { method: 'POST' });
      setNotice(`Instance ${action === 'start' ? 'started' : 'stopped'}.`);
      refresh();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const connect = async () => {
    if (!activeBroker) return setNotice('Activate a broker first.');
    const res = await api(`/api/users/${mobile}/connect`, { method: 'POST', body: { brokerId: activeBroker.id } });
    window.open(res.data.authUrl, '_blank', 'noopener,noreferrer');
  };

  const disconnect = async () => {
    if (!activeBroker) return;
    await api(`/api/users/${mobile}/brokers/${activeBroker.id}/disconnect`, { method: 'POST' });
    setNotice('Broker disconnected.');
    refresh();
  };
  const subscribed = strategies.filter((strategy) => strategy.subscribed);
  const today = new Date().toISOString().slice(0, 10);
  const todayTrades = trades.filter((trade) => String(trade.created_at || trade.entered_at || '').slice(0, 10) === today);
  const todayPnl = todayTrades.reduce((sum, trade) => sum + pnlForTrade(trade), 0);
  const openCount = details?.openOrders?.length || 0;

  return (
    <section className="userHome">
      <div className="statusStack">
        <div className="statusRow">
          <span className="roundIcon danger"><MonitorDot size={19} /></span>
          <div><small>Algo Status</small><strong className={instance.status === 'running' ? 'goodText' : 'badText'}>{instance.status === 'running' ? 'Running' : 'Stopped'}</strong></div>
          <button className={instance.status === 'running' ? 'danger' : 'primary'} onClick={() => startStop(instance.status === 'running' ? 'stop' : 'start')}>
            {instance.status === 'running' ? <Square size={16} /> : <Play size={16} />}{instance.status === 'running' ? 'Stop' : 'Start'}
          </button>
        </div>
        <div className="statusRow">
          <span className="roundIcon good"><User size={19} /></span>
          <div><small>Broker Status</small><strong className={activeBroker?.is_connected ? 'goodText' : 'badText'}>{activeBroker?.is_connected ? 'Connected' : 'Disconnected'}</strong></div>
          <span className="statusTime">{activeBroker?.connected_at || 'Connect daily'}</span>
        </div>
      </div>

      <div className="summaryGrid">
        <Metric icon={TrendingUp} label="Active Strategies" value={subscribed.length} tone="good" />
        <Metric icon={IndianRupee} label="Today's P&L" value={money(todayPnl)} tone={todayPnl >= 0 ? 'good' : 'warn'} />
        <Metric icon={Activity} label="Open Trades" value={openCount} />
        <Metric icon={ShieldCheck} label="Risk Limit" value="2 Orders" />
      </div>

      <div className="userTileGrid">
        <button className="userTile" onClick={() => setTab('broker')}><span className="tileIcon"><User size={28} /></span><strong>Brokers</strong></button>
        <button className="userTile" onClick={() => setTab('trades')}><span className="tileIcon good"><BarChart3 size={28} /></span><strong>Trade Summary</strong></button>
        <button className="userTile" onClick={() => setTab('strategy')}><span className="tileIcon warn"><Database size={28} /></span><strong>Strategy Subscriptions</strong></button>
      </div>

      <div className="panel wide controlPanel">
        <div className="panelHeader">
          <h2>Controls</h2>
          <button onClick={loadHistory}><History size={16} />Login History</button>
        </div>
        <div className="actionGrid">
          <button className="primary" onClick={connect} disabled={!activeBroker}><Wifi size={16} />Connect Broker</button>
          <button onClick={disconnect} disabled={!activeBroker?.is_connected}><WifiOff size={16} />Disconnect</button>
          <button onClick={() => startStop('start')}><Play size={16} />Start Instance</button>
          <button onClick={() => startStop('stop')}><Square size={16} />Stop Instance</button>
        </div>
        <div className="miniGrid">
          <Info label="User" value={`${details?.user?.name || 'User'} · ${mobile}`} />
          <Info label="Active Broker" value={activeBroker ? `${activeBroker.broker} · ${activeBroker.is_active ? 'active' : 'saved'}` : 'No broker configured'} />
          <Info label="Broker Accounts" value={brokers.length} />
          <Info label="Last Instance Update" value={instance.updated_at || '-'} />
        </div>
      </div>
      <div className="panel wide">
        <div className="panelHeader"><h2>Open Order Monitor</h2><span className="pill">live positions only</span></div>
        <div className="positionStrip">
          {(details?.openOrders || []).map((order) => <OrderMiniCard key={order.id || order.order_tag} order={order} />)}
          {(!details?.openOrders || details.openOrders.length === 0) && <div className="emptyState">No running orders. Once a strategy enters, SL, target and order tag will appear here.</div>}
        </div>
      </div>
    </section>
  );
}

function UserBrokers({ mobile, brokers, settings, refresh, setNotice }) {
  const [form, setForm] = useState(emptyBroker());
  const serverIp = settings?.server_static_ip || window.location.hostname || '127.0.0.1';
  const callback = `${API}/api/callback/${form.broker}`;

  const save = async () => {
    try {
      await api(`/api/users/${mobile}/broker`, { method: 'PUT', body: form });
      setForm(emptyBroker(form.broker));
      setNotice('Broker saved.');
      refresh();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const activate = async (id) => {
    await api(`/api/users/${mobile}/brokers/${id}/active`, { method: 'POST' });
    refresh();
  };

  const remove = async (id) => {
    await api(`/api/users/${mobile}/brokers/${id}`, { method: 'DELETE' });
    refresh();
  };

  return (
    <section className="mobileFlow">
      <div className="panel brokerFormCard">
        <div className="panelHeader"><h2>{form.id ? 'Modify Broker' : 'Add Broker'}</h2><button className="primary" onClick={save}><Save size={16} />Save</button></div>
        <div className="formStack">
          <Select label="Broker" value={form.broker} onChange={(broker) => setForm({ ...form, broker, redirectUrl: `${API}/api/callback/${broker}` })} options={['fyers', 'upstox']} />
          <input placeholder="Account label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <input placeholder="API key" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
          <input placeholder="Secret key" value={form.secretKey} onChange={(e) => setForm({ ...form, secretKey: e.target.value })} />
          <input placeholder="Callback URL" value={form.redirectUrl} onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })} />
        </div>
        <div className="hint">
          Add server IP <b>{serverIp}</b> in the broker app settings. Use callback URL <b>{callback}</b>.
        </div>
      </div>
      <div className="brokerCards">
          {brokers.map((broker) => (
            <article className="brokerCard" key={broker.id}>
              <button className="cardEdit" onClick={() => setForm(toBrokerForm(broker))}><Settings size={18} /></button>
              <div className="brokerMain">
                <strong>{broker.label || broker.broker}</strong>
                <span>API Key: {maskValue(broker.api_key)}</span>
                <span>Status: <b className={broker.is_connected ? 'goodText' : 'badText'}>{broker.is_connected ? 'ACTIVE' : 'INACTIVE'}</b></span>
                <small>Updated on: {broker.updated_at || '-'}</small>
              </div>
              <div className="buttonCluster">
                <button className={broker.is_active ? 'success' : ''} onClick={() => activate(broker.id)}><CheckCircle2 size={16} />{broker.is_active ? 'Active' : 'Set Active'}</button>
                <button className="danger ghost" onClick={() => remove(broker.id)}><Trash2 size={16} /></button>
              </div>
            </article>
          ))}
          {brokers.length === 0 && <div className="emptyState">No broker accounts yet.</div>}
      </div>
    </section>
  );
}

function UserStrategies({ mobile, strategies, refresh, setNotice }) {
  const activeStrategies = strategies.filter((strategy) => strategy.enabled);
  const [history, setHistory] = useState(null);
  const [historyStrategy, setHistoryStrategy] = useState(null);
  const save = async (strategy, enabled) => {
    await api(`/api/users/${mobile}/strategies/${strategy.code}`, {
      method: 'PUT',
      body: { enabled, targetLevel: strategy.target_level || 1 },
    });
    setNotice(enabled ? 'Strategy subscribed.' : 'Strategy disabled.');
    refresh();
  };

  const target = async (strategy, targetLevel) => {
    await api(`/api/users/${mobile}/strategies/${strategy.code}`, { method: 'PUT', body: { enabled: strategy.subscribed, targetLevel } });
    refresh();
  };

  const openHistory = async (strategy) => {
    try {
      const res = await api(`/api/users/${mobile}/strategies/${strategy.code}/history`);
      setHistory(res.data || { trades: [], backtests: [] });
      setHistoryStrategy(strategy);
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <>
      <section className="mobileFlow">
        {activeStrategies.map((strategy) => (
          <article className="subscriptionCard" key={strategy.code}>
            <div className="subscriptionTop">
              <div>
                <strong>{strategy.name}</strong>
                <span>{strategy.mode} · {strategy.timeframe} · {strategy.direction}</span>
              </div>
              <b className={strategy.subscribed ? 'badge active' : 'badge inactive'}>{strategy.subscribed ? 'ACTIVE' : 'INACTIVE'}</b>
            </div>
            <div className="subscriptionFacts">
              <span>Lot Size: 1</span>
              <span>Min Fund: {money(strategy.min_capital)}</span>
            </div>
            <div className="strategyChips">
              <span>Type: Full Exit At Target</span>
              <span>Final Exit At: Target {strategy.target_level || 1}</span>
            </div>
            <TargetPicker
              label="Final Exit At"
              value={strategy.target_level || 1}
              onChange={(level) => target(strategy, level)}
            />
            <div className="strategyFooter">
              <button onClick={() => openHistory(strategy)}><History size={16} />History</button>
              <button className={strategy.subscribed ? 'danger ghost' : 'primary'} onClick={() => save(strategy, !strategy.subscribed)}>
                {strategy.subscribed ? 'Unsubscribe' : 'Subscribe'}
              </button>
            </div>
          </article>
        ))}
        {activeStrategies.length === 0 && <div className="emptyState">No active strategies are available right now.</div>}
      </section>
      {history && (
        <Modal title={`${historyStrategy?.name || 'Strategy'} History`} onClose={() => setHistory(null)}>
          <div className="historyStack">
            <div className="miniGrid twoCols">
              <Info label="Linked Instruments" value={history.watchlist?.length ? history.watchlist.join(', ') : 'All active instruments'} />
              <Info label="Historical Runs" value={history.backtests?.length || 0} />
            </div>
            <div>
              <h3 className="sectionTitle">Triggered Trades</h3>
              <DataTable rows={history.trades || []} columns={['symbol', 'side', 'quantity', 'status', 'entry_price', 'exit_price', 'exit_reason', 'entered_at', 'order_tag']} highlightPnl />
            </div>
            <div>
              <h3 className="sectionTitle">Backtest Performance</h3>
              <DataTable rows={(history.backtests || []).map((row) => ({ symbol: row.symbol, range_from: row.range_from, range_to: row.range_to, created_at: row.created_at, ...row.stats }))} columns={['symbol', 'range_from', 'range_to', 'totalTrades', 'wins', 'losses', 'successRatio', 'targetHits', 'slHits', 'totalPnl', 'maxDrawdown']} highlightPnl />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function AdminApp({ session, logout, notice, setNotice }) {
  const [tab, setTab] = useState('overview');
  const [state, setState] = useState({});
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    try {
      const [settings, instruments, trades, openOrders, brokers, instances, performance, backtests, logs, users, strategies] = await settleApi([
        api('/api/admin/settings'),
        api('/api/admin/instruments'),
        api('/api/admin/trades'),
        api('/api/admin/open-orders'),
        api('/api/admin/brokers'),
        api('/api/admin/instances'),
        api('/api/admin/performance'),
        api('/api/admin/backtests'),
        api('/api/admin/logs?limit=100'),
        api('/api/admin/users'),
        api('/api/admin/strategies'),
      ]);
      setState({
        settings: settings.ok ? settings.data || {} : state.settings || {},
        instruments: instruments.ok ? instruments.data || [] : state.instruments || [],
        trades: trades.ok ? trades.data || [] : state.trades || [],
        openOrders: openOrders.ok ? openOrders.data || [] : state.openOrders || [],
        brokers: brokers.ok ? brokers.data || [] : state.brokers || [],
        instances: instances.ok ? instances.data || [] : state.instances || [],
        performance: performance.ok ? performance.data || [] : state.performance || [],
        backtests: backtests.ok ? backtests.data || [] : state.backtests || [],
        logs: logs.ok ? logs.data || [] : state.logs || [],
        users: users.ok ? users.data || [] : state.users || [],
        strategies: strategies.ok ? strategies.data || [] : state.strategies || [],
      });
      const failed = [settings, instruments, trades, openOrders, brokers, instances, performance, backtests, logs, users, strategies].find((item) => !item.ok);
      if (failed) setNotice(failed.error);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <Shell
      title="Admin Console"
      subtitle={notice || `Data source: ${state.brokers?.some((broker) => broker.is_connected) ? 'connected' : 'not connected'}`}
      nav={[
        ['overview', Gauge, 'Overview'],
        ['instruments', LineChart, 'Instruments'],
        ['users', Users, 'Users'],
        ['brokers', Briefcase, 'Brokers'],
        ['strategies', TrendingUp, 'Strategy'],
        ['backtest', BarChart3, 'Backtest'],
        ['performance', Activity, 'Performance'],
        ['trades', Database, 'Trades'],
        ['monitor', MonitorDot, 'Monitor'],
        ['logs', FileText, 'Logs'],
        ['system', Settings, 'System'],
      ]}
      active={tab}
      setActive={setTab}
      refresh={refresh}
      busy={busy}
      logout={logout}
    >
      {tab === 'overview' && <AdminOverview state={state} />}
      {tab === 'instruments' && <AdminInstruments instruments={state.instruments || []} refresh={refresh} setNotice={setNotice} />}
      {tab === 'users' && <AdminUsers users={state.users || []} refresh={refresh} setNotice={setNotice} />}
      {tab === 'brokers' && <AdminBrokerPanel settings={state.settings || {}} setNotice={setNotice} refresh={refresh} />}
      {tab === 'strategies' && <AdminStrategies strategies={state.strategies || []} instruments={state.instruments || []} setNotice={setNotice} refresh={refresh} />}
      {tab === 'backtest' && <Backtests instruments={state.instruments || []} setNotice={setNotice} />}
      {tab === 'performance' && <Performance performance={state.performance || []} backtests={state.backtests || []} />}
      {tab === 'trades' && <TradeCards trades={state.trades || []} setNotice={setNotice} />}
      {tab === 'monitor' && <Monitor openOrders={state.openOrders || []} brokers={state.brokers || []} instances={state.instances || []} />}
      {tab === 'logs' && <Logs logs={state.logs || []} />}
      {tab === 'system' && <SystemSettings settings={state.settings || {}} setNotice={setNotice} refresh={refresh} />}
    </Shell>
  );
}

function AdminOverview({ state }) {
  const connected = state.brokers?.filter((item) => item.is_connected).length || 0;
  const running = state.instances?.filter((item) => item.status === 'running').length || 0;
  return (
    <section className="grid">
      <Metric icon={LineChart} label="Tracked Instruments" value={state.instruments?.length || 0} />
      <Metric icon={Users} label="Users" value={state.users?.length || 0} />
      <Metric icon={Activity} label="Open Orders" value={state.openOrders?.length || 0} />
      <Metric icon={ShieldCheck} label="Market Status" value={marketOpen() ? 'Open' : 'Closed'} tone={marketOpen() ? 'good' : 'muted'} />
      <div className="panel wide workflowPanel">
        <div className="panelHeader"><h2>Today Workflow</h2><span className="pill">IST</span></div>
        <div className="workflowSteps">
          <Info label="08:00-09:10" value="Users connect broker and start instance" />
          <Info label="09:14" value="Fetch day open and calculate GANN levels" />
          <Info label="09:15-15:00" value="15m candles, entries, websocket exits" />
          <Info label="15:15" value="Force close intraday orders" />
        </div>
      </div>
      <div className="panel wide">
        <div className="panelHeader"><h2>Connected Users</h2><span className="pill">{connected} brokers · {running} instances</span></div>
        <DataTable rows={state.users || []} columns={['mobile', 'name', 'brokers', 'strategies', 'instance_status', 'active_trades', 'day_pnl']} highlightPnl />
      </div>
    </section>
  );
}

function AdminInstruments({ instruments, refresh, setNotice }) {
  const [symbol, setSymbol] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [trend, setTrend] = useState(null);
  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return instruments.filter((item) => {
      const categoryMatch = category === 'all' || item.category === category;
      const queryMatch = !q || item.symbol?.includes(q);
      return categoryMatch && queryMatch;
    });
  }, [instruments, query, category]);
  const featured = filtered.slice(0, 12);
  const add = async () => {
    await api('/api/admin/instruments', { method: 'POST', body: { symbol } });
    setSymbol('');
    setNotice('Instrument added. Daily data sync is marked for backend fetch.');
    refresh();
  };
  const resync = async (row) => {
    const rangeTo = new Date().toISOString().slice(0, 10);
    const rangeFrom = new Date(Date.now() - 65 * 86400000).toISOString().slice(0, 10);
    const res = await api('/api/admin/candles/fetch', {
      method: 'POST',
      body: { symbol: row.symbol, resolution: 'D', rangeFrom, rangeTo },
    });
    const result = res.data?.[0];
    if (result?.status === 'error') {
      setNotice(`${row.symbol} sync failed: ${result.error}`);
    } else {
      setNotice(`${row.symbol} synced: ${result?.count || 0} daily candles stored.`);
    }
    refresh();
  };
  const toggleTrend = async (row) => {
    if (expanded === row.symbol) {
      setExpanded(null);
      return;
    }
    setExpanded(row.symbol);
    try {
      const res = await api(`/api/admin/instruments/${row.symbol}/trend?limit=45`);
      setTrend(res.data || []);
    } catch (error) {
      setNotice(error.message);
      setTrend(null);
    }
  };
  return (
    <section className="instrumentLayout">
      <div className="panel wide">
        <div className="panelHeader"><h2>Instrument Universe</h2><button className="primary" onClick={add} disabled={!symbol}><Plus size={16} />Add</button></div>
        <div className="instrumentToolbar">
          <label className="searchField">
            <Search size={15} />
            <input placeholder="Search symbol" value={query} onChange={(e) => setQuery(e.target.value.toUpperCase())} />
          </label>
          <div className="segmented">
            {['all', 'stock', 'index', 'commodity'].map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{optionLabel(item)}</button>)}
          </div>
          <input className="symbolInput" placeholder="Add instrument" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
        </div>
      </div>
      <div className="instrumentCards">
        {featured.map((item) => <InstrumentSignalCard key={item.symbol} item={item} active={expanded === item.symbol} onClick={() => toggleTrend(item)} />)}
        {featured.length === 0 && <div className="emptyState wide">No instruments match this filter.</div>}
      </div>
      <div className="panel wide">
        <div className="panelHeader"><h2>Resolver & Sync Table</h2><span className="pill">{filtered.length} visible</span></div>
        <DataTable rows={filtered} columns={['symbol', 'category', 'candle_status', 'daily_candle_count', 'intraday_candle_count', 'latest_candle_date', 'latest_ha_swing_trend', 'continuation_days', 'latest_stop_loss', 'sync_status']} action={(row) => (
          <div className="buttonCluster">
            <button onClick={() => toggleTrend(row)}><LineChart size={16} /></button>
            <button onClick={() => resync(row)} title="Resync daily candles"><RefreshCw size={16} /></button>
            <SyncBar value={row.sync_progress} status={row.sync_status} />
          </div>
        )} />
        {expanded && <TrendBlocks symbol={expanded} rows={trend} />}
      </div>
    </section>
  );
}

function AdminUsers({ users, refresh, setNotice }) {
  const startStop = async (mobile, action) => {
    try {
      await api(`/api/users/${mobile}/${action}`, { method: 'POST' });
      setNotice(`${mobile} ${action} requested.`);
      refresh();
    } catch (error) {
      setNotice(error.message);
    }
  };
  return (
    <section className="panel">
      <div className="panelHeader"><h2>Users</h2></div>
      <DataTable rows={users} columns={['mobile', 'name', 'brokers', 'is_active', 'instance_status', 'strategies', 'intraday_wallet', 'swing_wallet', 'day_pnl']} highlightPnl action={(row) => (
        <div className="buttonCluster">
          <button onClick={() => startStop(row.mobile, 'start')}><Play size={16} /></button>
          <button onClick={() => startStop(row.mobile, 'stop')}><Square size={16} /></button>
        </div>
      )} />
    </section>
  );
}

function AdminBrokerPanel({ settings, setNotice, refresh }) {
  const [form, setForm] = useState({
    data_source_broker: settings.data_source_broker || 'fyers',
    data_source_api_key: settings.data_source_api_key || '',
    data_source_secret_key: settings.data_source_secret_key || '',
    data_source_access_token: settings.data_source_access_token || '',
    data_source_refresh_token: settings.data_source_refresh_token || '',
    data_source_status: settings.data_source_status || 'disconnected',
    server_static_ip: settings.server_static_ip || '',
    frontend_url: settings.frontend_url || 'https://algo.foodcrisis.in',
    public_api_base: settings.public_api_base || 'https://algoapi.foodcrisis.in',
  });
  const save = async () => {
    await api('/api/admin/settings', { method: 'POST', body: form });
    setNotice('Data source broker settings saved.');
    refresh();
  };
  const connect = async () => {
    await save();
    const res = await api('/api/admin/brokers/connect', { method: 'POST' });
    setNotice(`Opening ${res.data.broker} data source login.`);
    window.open(res.data.authUrl, '_blank', 'noopener,noreferrer');
  };
  return (
    <section className="grid two">
      <div className="panel">
        <div className="panelHeader">
          <h2>Data Source Broker</h2>
          <div className="buttonCluster">
            <button onClick={save}><Save size={16} />Save</button>
            <button className="primary" onClick={connect}><PlugZap size={16} />Connect</button>
          </div>
        </div>
        <div className="formStack">
          <Select label="Broker" value={form.data_source_broker} onChange={(v) => setForm({ ...form, data_source_broker: v })} options={['fyers']} />
          <input placeholder="API key" value={form.data_source_api_key} onChange={(e) => setForm({ ...form, data_source_api_key: e.target.value })} />
          <input placeholder="Secret key" value={form.data_source_secret_key} onChange={(e) => setForm({ ...form, data_source_secret_key: e.target.value })} />
          <input placeholder="Server static IP" value={form.server_static_ip || ''} onChange={(e) => setForm({ ...form, server_static_ip: e.target.value })} />
          <input placeholder="Frontend URL" value={form.frontend_url || ''} onChange={(e) => setForm({ ...form, frontend_url: e.target.value })} />
          <input placeholder="Public API base" value={form.public_api_base || ''} onChange={(e) => setForm({ ...form, public_api_base: e.target.value })} />
        </div>
      </div>
      <div className="panel">
        <div className="panelHeader"><h2>Status</h2><span className="pill">{form.data_source_status}</span></div>
        <div className="miniGrid twoCols">
          <Info label="Broker" value={form.data_source_broker} />
          <Info label="Callback" value={`${API}/api/callback/fyers?admin=1`} />
          <Info label="Access Token" value={form.data_source_access_token ? 'saved' : 'not connected'} />
          <Info label="Refresh Token" value={form.data_source_refresh_token ? 'saved' : 'not available'} />
        </div>
      </div>
    </section>
  );
}

function AdminStrategies({ strategies, instruments, setNotice, refresh }) {
  const [edits, setEdits] = useState({});
  const merged = (strategy) => ({ ...strategy, ...(edits[strategy.code] || {}) });
  const update = (strategy, patch) => setEdits({ ...edits, [strategy.code]: { ...merged(strategy), ...patch } });
  const save = async (strategy) => {
    const next = merged(strategy);
    await api(`/api/admin/strategies/${strategy.code}`, { method: 'PUT', body: {
      ...next,
      minCapital: next.min_capital,
      settings: next.settings,
    } });
    setEdits({});
    setNotice('Strategy settings saved.');
    refresh();
  };
  return (
    <section className="grid two">
      <div className="panel">
        <div className="panelHeader"><h2>Strategy Catalog</h2></div>
        <div className="strategyList">
          {strategies.map((strategy) => {
            const item = merged(strategy);
            return (
              <div className="strategyEdit" key={strategy.code}>
                <div>
                  <strong>{strategy.name}</strong>
                  <span>{strategy.code} · {strategy.mode} · success {Number(strategy.success_rate || 0).toFixed(1)}%</span>
                </div>
                <Toggle label="Enabled" value={item.enabled} onChange={(enabled) => update(strategy, { enabled })} />
                <Select label="EMA Filter" value={String(item.settings?.emaFilter ?? false)} onChange={(value) => update(strategy, { settings: { ...item.settings, emaFilter: value === 'both' ? 'both' : value === 'true' } })} options={['false', 'true', 'both']} />
                <NumberInput label="Capital" value={item.min_capital || 0} onChange={(min_capital) => update(strategy, { min_capital })} />
                <button className="primary" onClick={() => save(strategy)}><Save size={16} />Save</button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="panel">
        <div className="panelHeader"><h2>Watchlist Selector</h2></div>
        <div className="watchGrid">
          {strategies.map((strategy) => (
            <details key={strategy.code}>
              <summary>{strategy.name}</summary>
              <div className="checkGrid">
                {instruments.slice(0, 80).map((instrument) => <label key={`${strategy.code}-${instrument.symbol}`}><input type="checkbox" defaultChecked />{instrument.symbol}<span>{Number(strategy.success_rate || 0).toFixed(0)}%</span></label>)}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Backtests({ instruments, setNotice }) {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState({ symbol: instruments[0]?.symbol || 'SBIN', category: '', rangeFrom: monthAgo, rangeTo: today, useEma: true, sameCandlePolicy: 'SL_FIRST' });
  const [result, setResult] = useState({ summary: [], instruments: [] });
  const [expanded, setExpanded] = useState(null);
  const run = async () => {
    const body = cleanBacktestPayload(form);
    const res = await api('/api/admin/backtest/matrix', { method: 'POST', body });
    setResult(res.data || []);
    const count = res.data?.instruments?.length || 0;
    setExpanded(res.data?.instruments?.[0]?.symbol || null);
    setNotice(`Backtest completed for ${count} instrument${count === 1 ? '' : 's'}.`);
  };
  const summary = result.summary || [];
  const instrumentRows = result.instruments || [];
  return (
    <section className="backtestLayout">
      <div className="panel wide">
        <div className="panelHeader">
          <h2>Smart Backtest</h2>
          <button className="primary" onClick={run} disabled={!form.rangeFrom || !form.rangeTo}><Database size={16} />Run All Strategies</button>
        </div>
        <div className="toolbar backtestToolbar">
          <label className="field">
            <span>Instrument</span>
            <input list="backtest-symbols" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase(), category: '' })} placeholder="SBIN" />
            <datalist id="backtest-symbols">{instruments.map((item) => <option key={item.symbol} value={item.symbol} />)}</datalist>
          </label>
          <Select label="Group" value={form.category} onChange={(category) => setForm({ ...form, category, symbol: category ? '' : form.symbol })} options={['', 'stock', 'index', 'commodity']} />
          <label className="field"><span>From</span><input type="date" value={form.rangeFrom} onChange={(e) => setForm({ ...form, rangeFrom: e.target.value })} /></label>
          <label className="field"><span>To</span><input type="date" value={form.rangeTo} onChange={(e) => setForm({ ...form, rangeTo: e.target.value })} /></label>
          <Toggle label="EMA Variants" value={form.useEma} onChange={(value) => setForm({ ...form, useEma: value })} />
          <Select label="Same Candle" value={form.sameCandlePolicy} onChange={(sameCandlePolicy) => setForm({ ...form, sameCandlePolicy })} options={['SL_FIRST', 'TARGET_FIRST']} />
        </div>
        <div className="hint">Missing candle data is fetched once per instrument/resolution, then reused for every strategy and target-level variant.</div>
      </div>

      <div className="grid">
        <Metric icon={LineChart} label="Instruments Tested" value={instrumentRows.length} />
        <Metric icon={BarChart3} label="Variants" value={summary.length} />
        <Metric icon={CheckCircle2} label="Target Hits" value={summary.reduce((sum, row) => sum + Number(row.targetHits || 0), 0)} tone="good" />
        <Metric icon={ShieldCheck} label="SL Hits" value={summary.reduce((sum, row) => sum + Number(row.slHits || 0), 0)} tone="warn" />
      </div>

      <div className="backtestInstruments">
        {instrumentRows.map((instrument) => (
          <BacktestInstrument
            key={instrument.symbol}
            instrument={instrument}
            expanded={expanded === instrument.symbol}
            onToggle={() => setExpanded(expanded === instrument.symbol ? null : instrument.symbol)}
          />
        ))}
        {instrumentRows.length === 0 && <div className="emptyState">Run a backtest to see instrument-level results.</div>}
      </div>

      <div className="panel wide">
        <div className="panelHeader"><h2>All Variants Ranked</h2><span className="pill">best P/L first</span></div>
        <DataTable rows={summary} columns={['variant', 'strategyName', 'symbol', 'targetLevel', 'useEma', 'totalTrades', 'targetHits', 'slHits', 'successRatio', 'totalPnl', 'maxLoss', 'maxDrawdown']} highlightPnl />
      </div>
    </section>
  );
}

function BacktestInstrument({ instrument, expanded, onToggle }) {
  const best = instrument.bestVariant;
  const bestStats = best?.stats || {};
  return (
    <article className="backtestInstrument panel">
      <button className="instrumentHeader" onClick={onToggle}>
        <div>
          <strong>{instrument.symbol}</strong>
          <span>{instrument.category} · 15m {instrument.candleCounts?.intraday || 0} · daily {instrument.candleCounts?.daily || 0}</span>
        </div>
        <div className="instrumentScore">
          <b className={pnlClass(bestStats.totalPnl)}>{formatCell(bestStats.totalPnl)}</b>
          <span>{formatCell(bestStats.successRatio)}% · {best?.variant || 'No trades'}</span>
        </div>
      </button>
      {expanded && (
        <div className="strategyResultStack">
          {instrument.strategies.map((strategy) => <StrategyBacktestGroup key={strategy.code} strategy={strategy} />)}
        </div>
      )}
    </article>
  );
}

function StrategyBacktestGroup({ strategy }) {
  const best = strategy.bestVariant;
  return (
    <section className="strategyResult">
      <div className="panelHeader">
        <h2>{strategy.name}</h2>
        <span className="pill">Best {best?.targetLevel ? `T${best.targetLevel}` : '-'} · {best?.useEma ? 'EMA' : 'No EMA'}</span>
      </div>
      <div className="targetStatGrid">
        {strategy.targetStats.map((target) => (
          <div className="targetStat" key={target.target}>
            <strong>{target.target}</strong>
            <span>{target.targetHits} TG · {target.slHits} SL</span>
            <em className={pnlClass(target.pnl)}>{formatCell(target.pnl)}</em>
          </div>
        ))}
      </div>
      <div className="variantRail">
        {strategy.variants.map((variant) => (
          <div className="variantLane" key={variant.variant}>
            <div className="variantLabel">
              <strong>T{variant.targetLevel}</strong>
              <span>{variant.useEma ? 'EMA' : 'No EMA'} · {variant.stats.totalTrades} trades · <b className={pnlClass(variant.stats.totalPnl)}>{formatCell(variant.stats.totalPnl)}</b></span>
            </div>
            <TradeDayBlocks blocks={variant.dayBlocks} />
          </div>
        ))}
      </div>
    </section>
  );
}

function TradeDayBlocks({ blocks }) {
  if (!blocks?.length) return <div className="dayBlocks empty"><span>No trades</span></div>;
  return (
    <div className="dayBlocks">
      {blocks.map((block) => {
        const tone = block.pnl > 0 ? 'win' : block.pnl < 0 ? 'loss' : 'flat';
        return (
          <div className={`dayBlock ${tone}`} key={block.day} title={`${block.day}\nP/L ${block.pnl}\nTrades ${block.trades}\nTG ${block.targetHits} SL ${block.slHits}\n${block.reasons.join(', ')}`}>
            <strong>{block.day.slice(5)}</strong>
            <span>{formatCell(block.pnl)}</span>
            <em>{block.targetHits}T/{block.slHits}SL</em>
          </div>
        );
      })}
    </div>
  );
}

function Performance({ performance, backtests }) {
  const bestStocks = useMemo(() => summarizeBestBacktests(backtests), [backtests]);
  return (
    <section className="grid two">
      <div className="panel"><div className="panelHeader"><h2>Strategy Stats</h2></div><DataTable rows={performance} columns={['strategy', 'runs', 'totalTrades', 'wins', 'losses', 'successRatio', 'totalPnl', 'maxDrawdown']} highlightPnl /></div>
      <div className="panel">
        <div className="panelHeader"><h2>Best Stocks</h2><span className="pill">trade-backed</span></div>
        <DataTable rows={bestStocks} columns={['strategy', 'symbol', 'runs', 'totalTrades', 'successRatio', 'totalPnl', 'bestRange']} highlightPnl />
        {bestStocks.length === 0 && <div className="hint">No meaningful best stock yet. Run backtests after candle data is synced; zero-trade rows are hidden here.</div>}
      </div>
    </section>
  );
}

function TrendBlocks({ symbol, rows }) {
  const normalRows = rows?.latestFirst?.normal || rows?.normal || [];
  const haRows = rows?.latestFirst?.heikinAshi || rows?.heikinAshi || [];
  return (
    <div className="trendPanel">
      <div className="panelHeader">
        <h2>{symbol} Trend Blocks</h2>
        <span className="pill">{rows?.loadedCandles || 0} daily candles · HA warmup {rows?.requiredWarmupDays || 0}d</span>
      </div>
      <TrendTrack title="Normal Candles" rows={normalRows} />
      <TrendTrack title="Heikin Ashi" rows={haRows} />
      {normalRows.length === 0 && haRows.length === 0 && <div className="emptyState">No daily candle trend yet. Resync daily candles first.</div>}
    </div>
  );
}

function TrendTrack({ title, rows }) {
  return (
    <div className="trendTrack">
      <div className="trackTitle"><strong>{title}</strong><span>latest to old</span></div>
      <div className="trendBlocks">
        {rows.map((row) => (
          <div className={`trendBlock ${trendTone(row.trend)}`} key={`${row.mode}-${row.trade_date}`} title={trendTitle(row)}>
            <strong>{row.trade_date.slice(5)}</strong>
            <span>{trendLabel(row.trend)}</span>
            <em>{row.continuation_days}d · SL {formatCell(row.stop_loss)}</em>
            <small>{targetTicks(row.target_hits)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function trendTitle(row) {
  const targets = (row.target_hits || []).map((target) => `T${target.level}:${target.hit ? 'hit' : '-'}`).join(' ');
  return [
    `${row.trade_date} ${row.mode === 'ha' ? 'Heikin Ashi' : 'Normal'} ${row.trend}`,
    `Open ${formatCell(row.open)} High ${formatCell(row.high)} Low ${formatCell(row.low)} Close ${formatCell(row.close)}`,
    `GANN Buy ${formatCell(row.gann_buy)} Sell ${formatCell(row.gann_sell)}`,
    `SL ${formatCell(row.stop_loss)} SL hit ${row.sl_hit ? 'yes' : 'no'}`,
    targets,
  ].join('\n');
}

function targetTicks(targets = []) {
  return targets.map((target) => (target.hit ? `T${target.level}✓` : `T${target.level}`)).join(' ');
}

function trendTone(trend = '') {
  const value = String(trend || '');
  if (value.includes('BULLISH')) return 'bullish';
  if (value.includes('BEARISH')) return 'bearish';
  return 'neutral';
}

function trendLabel(trend = '') {
  const value = String(trend || '');
  if (value.includes('EXTREME_BULLISH')) return 'Bull+';
  if (value.includes('MILD_BULLISH')) return 'Bull';
  if (value.includes('EXTREME_BEARISH')) return 'Bear+';
  if (value.includes('MILD_BEARISH')) return 'Bear';
  return 'Neutral';
}

function Monitor({ openOrders, brokers, instances }) {
  return (
    <section className="grid two">
      <div className="panel"><div className="panelHeader"><h2>Open Orders</h2></div><DataTable rows={openOrders} columns={['mobile', 'strategy', 'symbol', 'side', 'status', 'entry_price', 'target_price', 'stop_loss', 'order_tag']} /></div>
      <div className="panel"><div className="panelHeader"><h2>Broker Connections</h2></div><DataTable rows={brokers} columns={['mobile', 'broker', 'is_connected', 'connected_at', 'updated_at']} /></div>
      <div className="panel wide"><div className="panelHeader"><h2>Running Instances</h2></div><DataTable rows={instances} columns={['mobile', 'status', 'started_at', 'stopped_at', 'updated_at']} /></div>
    </section>
  );
}

function Logs({ logs }) {
  return <section className="panel"><div className="panelHeader"><h2>Audit Logs</h2></div><DataTable rows={logs} columns={['created_at', 'level', 'scope', 'message']} /></section>;
}

function SystemSettings({ settings, setNotice, refresh }) {
  const [form, setForm] = useState(settings);
  const save = async () => {
    await api('/api/admin/settings', { method: 'POST', body: form });
    setNotice('System settings saved.');
    refresh();
  };
  return (
    <section className="grid two">
      <div className="panel">
        <div className="panelHeader"><h2>Websocket & Scheduler</h2><button className="primary" onClick={save}><Save size={16} />Save</button></div>
        <div className="formGrid">
          <Toggle label="Dry Run Orders" value={form.dry_run_orders} onChange={(v) => setForm({ ...form, dry_run_orders: v })} />
          <Toggle label="Live Feed" value={form.live_feed_enabled} onChange={(v) => setForm({ ...form, live_feed_enabled: v })} />
          <Toggle label="Scheduler" value={form.scheduler_enabled} onChange={(v) => setForm({ ...form, scheduler_enabled: v })} />
          <NumberInput label="FYERS/sec" value={form.fyers_rate_limit_per_second || 20} onChange={(v) => setForm({ ...form, fyers_rate_limit_per_second: v })} />
          <NumberInput label="Daily Loss" value={form.max_daily_loss_per_user || 3000} onChange={(v) => setForm({ ...form, max_daily_loss_per_user: v })} />
          <NumberInput label="Trades/Day" value={form.max_trades_per_user_per_day || 4} onChange={(v) => setForm({ ...form, max_trades_per_user_per_day: v })} />
        </div>
      </div>
      <div className="panel">
        <div className="panelHeader"><h2>Telegram</h2></div>
        <div className="formStack">
          <Toggle label="Telegram Alerts" value={form.telegram_enabled} onChange={(v) => setForm({ ...form, telegram_enabled: v })} />
          <input placeholder="Bot token" value={form.telegram_bot_token || ''} onChange={(e) => setForm({ ...form, telegram_bot_token: e.target.value })} />
          <input placeholder="Chat ID" value={form.telegram_chat_id || ''} onChange={(e) => setForm({ ...form, telegram_chat_id: e.target.value })} />
        </div>
      </div>
    </section>
  );
}

function TradeCards({ trades, mobile, setTrades, setNotice }) {
  const today = new Date().toISOString().slice(0, 10);
  const [category, setCategory] = useState('all');
  const [date, setDate] = useState('');
  const load = async () => {
    if (!setTrades) return;
    try {
      const params = new URLSearchParams();
      if (mobile) params.set('mobile', mobile);
      if (category !== 'all') params.set('category', category);
      if (date) params.set('date', date);
      const res = await api(`/api/admin/trades?${params.toString()}`);
      setTrades(res.data || []);
      setNotice?.(`Loaded ${res.data?.length || 0} trade records.`);
    } catch (error) {
      setNotice?.(error.message);
    }
  };
  useEffect(() => {
    if (setTrades) load();
  }, [category, date]);
  const filteredTrades = setTrades ? trades : trades.filter((trade) => {
    const categoryMatch = category === 'all' || trade.category === category;
    const dateValue = String(trade.created_at || trade.entered_at || '').slice(0, 10);
    const dateMatch = !date || dateValue === date;
    return categoryMatch && dateMatch;
  });
  const netPnl = filteredTrades.reduce((sum, trade) => sum + pnlForTrade(trade), 0);
  const wins = filteredTrades.filter((trade) => pnlForTrade(trade) > 0).length;
  const avgPnl = filteredTrades.length ? netPnl / filteredTrades.length : 0;
  return (
    <section className="tradeSection">
      <div className="tradeSummaryHero">
        <Info label="Total Trades" value={filteredTrades.length} />
        <Info label="Net P&L" value={money(netPnl)} />
        <Info label="Win Rate" value={`${filteredTrades.length ? (wins / filteredTrades.length * 100).toFixed(1) : '0.0'}%`} />
        <Info label="Avg P&L" value={money(avgPnl)} />
      </div>
      <div className="panel">
        <div className="panelHeader"><h2>Trade History</h2><span className="pill">{filteredTrades.length} records</span></div>
        <div className="instrumentToolbar">
          <div className="segmented">
            {['all', 'stock', 'index', 'commodity'].map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{optionLabel(item)}</button>)}
          </div>
          <label className="field">
            <span>Trade Date</span>
            <input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <div className="buttonCluster">
            <button onClick={() => { setDate(''); setCategory('all'); }}><RefreshCw size={16} />Reset</button>
            {setTrades && <button className="primary" onClick={load}><Search size={16} />Load</button>}
          </div>
        </div>
      </div>
      <div className="tradeGrid">
      {filteredTrades.map((trade) => {
        const pnl = pnlForTrade(trade);
        const hit = String(trade.exit_reason || '').includes('TARGET') ? 'target' : String(trade.exit_reason || '').includes('SL') ? 'sl' : 'live';
        return (
          <article className="tradeCard" key={trade.id || trade.order_tag}>
            <div className="tradeTop">
              <strong>{trade.symbol}</strong>
              <span className={pnl >= 0 ? 'pnl good' : 'pnl bad'}>{trade.status} · {trade.category || 'stock'}</span>
            </div>
            <div className="targetBoxes">
              {[1, 2, 3, 4, 5].map((level) => <span key={level} className={hit === 'target' && Number(trade.target_level) === level ? 'hit' : ''}>T{level}</span>)}
              <span className={hit === 'sl' ? 'slHit' : ''}>SL</span>
            </div>
            <div className="miniGrid twoCols">
              <Info label="Entry" value={trade.entry_price} />
              <Info label="Live/Exit" value={trade.exit_price || trade.entry_price} />
              <Info label="Qty" value={trade.quantity} />
              <Info label="P/L" value={pnl.toFixed(2)} />
              <Info label="Time" value={trade.entered_at || trade.created_at} />
              <Info label="Tag" value={trade.order_tag} />
            </div>
          </article>
        );
      })}
      {filteredTrades.length === 0 && <div className="emptyState">No trades found for this filter.</div>}
      </div>
    </section>
  );
}

function InstrumentSignalCard({ item, active, onClick }) {
  const tone = trendTone(item.latest_ha_swing_trend);
  const synced = item.sync_status === 'ready' || item.sync_status === 'complete';
  const hasCandles = Number(item.candle_count || 0) > 0;
  const Icon = tone === 'bullish' ? TrendingUp : tone === 'bearish' ? TrendingDown : LineChart;
  return (
    <button className={`instrumentCard ${tone} ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="instrumentCardTop">
        <div>
          <strong>{item.symbol}</strong>
          <span>{item.category || 'unmapped'}</span>
        </div>
        <Icon size={18} />
      </div>
      <span className={`statusDot candleDot ${hasCandles ? 'active' : ''}`}>
        {hasCandles ? `${item.candle_count} candles` : 'No candles'}
      </span>
      <div className="signalRow">
        <SignalPill icon={Clock} label={`${item.continuation_days || 0}d`} tone={tone} />
        <SignalPill icon={Target} label={formatCell(item.latest_stop_loss)} tone="neutral" />
        <SignalPill icon={synced ? CheckCircle2 : AlertTriangle} label={item.sync_status || 'pending'} tone={synced ? 'good' : 'warn'} />
      </div>
      <div className="syncLine"><span style={{ width: `${Number(item.sync_progress || 0)}%` }} /></div>
    </button>
  );
}

function SignalPill({ icon: Icon, label, tone = 'neutral' }) {
  return <span className={`signalPill ${tone}`}><Icon size={12} />{label}</span>;
}

function StepCard({ icon: Icon, label, value, tone = 'neutral' }) {
  return (
    <div className={`stepCard ${tone}`}>
      <Icon size={17} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function OrderMiniCard({ order }) {
  const side = String(order.side || '').toUpperCase();
  return (
    <article className="orderMiniCard">
      <div className="tradeTop">
        <strong>{order.symbol}</strong>
        <span className={side === 'SELL' ? 'pnl bad' : 'pnl good'}>{side || order.status}</span>
      </div>
      <div className="miniGrid twoCols">
        <Info label="Entry" value={order.entry_price} />
        <Info label="Target" value={order.target_price} />
        <Info label="SL" value={order.stop_loss} />
        <Info label="Tag" value={order.order_tag} />
      </div>
    </article>
  );
}

function StatusStrip() {
  const mins = currentIstMinutes();
  const next = mins < 8 * 60 ? 'Users can connect from 08:00' : mins < 9 * 60 + 14 ? 'Prepare data-source login and user connections' : mins < 15 * 60 ? 'Live strategy and websocket monitoring' : mins < 15 * 60 + 30 ? 'Exit checks and intraday close' : 'Market workflow complete';
  return (
    <div className="statusStrip">
      <SignalPill icon={ShieldCheck} label={marketOpen() ? 'Market open' : 'Market closed'} tone={marketOpen() ? 'good' : 'neutral'} />
      <SignalPill icon={Clock} label={new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} tone="neutral" />
      <SignalPill icon={IndianRupee} label="Dry-run can be toggled in System" tone="warn" />
      <span>{next}</span>
    </div>
  );
}

function Shell({ title, subtitle, nav, active, setActive, children, refresh, busy, logout }) {
  const mode = title === 'Algo Trading' ? 'userMode' : 'adminMode';
  return (
    <div className={`app ${mode}`}>
      <aside className="sidebar">
        <div className="brand"><Bolt size={22} /><div><strong>AlgoBot</strong><span>Trading Console</span></div></div>
        <nav className="navRail">
          {nav.map(([id, Icon, label]) => <button key={id} className={active === id ? 'nav active' : 'nav'} onClick={() => setActive(id)} title={label}><Icon size={17} /><span>{label}</span></button>)}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div><h1>{title}</h1><p>{subtitle}</p></div>
          <div className="buttonCluster">
            <button className="iconButton" onClick={refresh} disabled={busy}><RefreshCw size={18} className={busy ? 'spin' : ''} /></button>
            <button className="iconButton" onClick={logout}><LogOut size={18} /></button>
          </div>
        </header>
        <StatusStrip />
        {children}
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone = 'neutral' }) {
  return <div className={`metric ${tone}`}><Icon size={18} /><span>{label}</span><strong>{String(value)}</strong></div>;
}

function Info({ label, value }) {
  return <div className="info"><span>{label}</span><strong>{formatCell(value)}</strong></div>;
}

function DataTable({ rows = [], columns, action, highlightPnl }) {
  return (
    <div className="tableWrap">
      <table>
        <thead><tr>{columns.map((column) => <th key={column}>{column.replaceAll('_', ' ')}</th>)}{action && <th />}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length + (action ? 1 : 0)}>No records</td></tr>}
          {rows.map((row, index) => (
            <tr key={`${row.id || row.mobile || row.symbol || index}-${index}`}>
              {columns.map((column) => <td key={column} className={highlightPnl && /pnl|profit|totalPnl/i.test(column) ? pnlClass(row[column]) : ''}>{renderCell(row, column)}</td>)}
              {action && <td>{action(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderCell(row, column) {
  if (column === 'candle_status') {
    const hasCandles = Number(row.candle_count || 0) > 0;
    return <span className={`statusDot ${hasCandles ? 'active' : ''}`}>{hasCandles ? 'Stored' : 'Missing'}</span>;
  }
  return formatCell(row[column]);
}

function Select({ label, value, onChange, options }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option} value={option}>{optionLabel(option)}</option>)}</select></label>;
}

function Toggle({ label, value, onChange }) {
  return <label className="field inline"><span>{label}</span><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /></label>;
}

function NumberInput({ label, value, onChange }) {
  return <label className="field"><span>{label}</span><input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}

function TargetPicker({ label, value, onChange }) {
  return (
    <div className="targetPicker">
      <span>{label}</span>
      <div>
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            type="button"
            className={Number(value) === level ? 'active' : ''}
            onClick={() => onChange(level)}
          >
            <strong>T{level}</strong>
            <small>{level === 1 ? 'Fast' : level === 5 ? 'Stretch' : `${level}x`}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return <div className="modalBackdrop"><div className="modal"><div className="panelHeader"><h2>{title}</h2><button onClick={onClose}>Close</button></div>{children}</div></div>;
}

function SyncBar({ value = 0, status }) {
  return <div className="sync"><span style={{ width: `${Number(value || 0)}%` }} /><em>{status}</em></div>;
}

function emptyBroker(broker = 'fyers') {
  return { broker, label: '', apiKey: '', secretKey: '', redirectUrl: `${API}/api/callback/${broker}` };
}

function toBrokerForm(broker) {
  return { id: broker.id, broker: broker.broker, label: broker.label || '', apiKey: broker.api_key || '', secretKey: '', redirectUrl: broker.redirect_url || `${API}/api/callback/${broker.broker}` };
}

function marketOpen() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

function formatCell(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(2);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  return String(value);
}

function summarizeBestBacktests(backtests = []) {
  const grouped = new Map();
  for (const row of backtests) {
    const stats = row.stats || {};
    const trades = Number(stats.totalTrades || 0);
    if (trades <= 0) continue;
    const key = `${row.strategy}:${row.symbol}`;
    const current = grouped.get(key) || {
      strategy: row.strategy,
      symbol: row.symbol,
      runs: 0,
      totalTrades: 0,
      wins: 0,
      totalPnl: 0,
      bestRange: '',
    };
    current.runs += 1;
    current.totalTrades += trades;
    current.wins += Number(stats.wins || 0);
    current.totalPnl += Number(stats.totalPnl || 0);
    current.bestRange = `${formatCell(row.range_from)} to ${formatCell(row.range_to)}`;
    grouped.set(key, current);
  }
  return [...grouped.values()]
    .map((row) => ({
      ...row,
      totalPnl: Number(row.totalPnl.toFixed(2)),
      successRatio: row.totalTrades ? Number((row.wins / row.totalTrades * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.totalPnl - a.totalPnl || b.successRatio - a.successRatio)
    .slice(0, 20);
}

function optionLabel(option) {
  if (option === '') return 'Single Instrument';
  if (option === 'all') return 'All';
  return option;
}

function pnlClass(value) {
  const num = Number(value || 0);
  return num > 0 ? 'goodText' : num < 0 ? 'badText' : '';
}

function cleanBacktestPayload(form) {
  const payload = {
    rangeFrom: form.rangeFrom,
    rangeTo: form.rangeTo,
    useEma: form.useEma,
    sameCandlePolicy: form.sameCandlePolicy,
  };
  if (form.category) payload.category = form.category;
  else if (form.symbol) payload.symbol = form.symbol;
  return payload;
}

function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function maskValue(value = '') {
  const text = String(value || '');
  if (!text) return '-';
  return `${text.slice(0, 4)}${'*'.repeat(Math.min(Math.max(text.length - 4, 4), 16))}`;
}

function pnlForTrade(trade) {
  const entry = Number(trade.entry_price || 0);
  const exit = Number(trade.exit_price || trade.entry_price || 0);
  const qty = Number(trade.quantity || 1);
  return trade.side === 'SELL' ? (entry - exit) * qty : (exit - entry) * qty;
}

function currentIstMinutes() {
  const parts = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return hour * 60 + minute;
}

async function api(path, options = {}) {
  const method = options.method || 'GET';
  const cacheKey = method === 'GET' ? path : null;
  const cached = cacheKey ? apiCache.get(cacheKey) : null;
  if (cached && Date.now() - cached.time < 15000) return cached.value;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 20000);
  try {
    const response = await fetch(`${API}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    const json = text ? safeJson(text) : {};
    if (!response.ok || json.ok === false) throw new Error(json.error || statusMessage(response.status));
    if (cacheKey) apiCache.set(cacheKey, { time: Date.now(), value: json });
    if (method !== 'GET') apiCache.clear();
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

async function settleApi(requests) {
  const results = await Promise.allSettled(requests);
  return results.map((result) => {
    if (result.status === 'fulfilled') return { ok: true, data: result.value.data };
    return { ok: false, error: result.reason?.message || 'API request failed' };
  });
}

function statusMessage(status) {
  if (status === 503) return 'Backend is temporarily unavailable. Please retry after server restart.';
  if (status === 502) return 'Backend gateway is unavailable.';
  if (status === 504) return 'Backend request timed out.';
  return 'API request failed';
}

function safeJson(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

createRoot(document.getElementById('root')).render(<App />);
