import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '@/components/BackButton';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Key, Lock, ShieldAlert, Eye, EyeOff, Loader2 } from 'lucide-react';

type PinType = 'main_app' | 'history_summary' | 'admin';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { isAdminAuthenticated, changePin, logoutAdmin } = useAuth();

    const [changingPin, setChangingPin] = useState<PinType | null>(null);
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [showNewPin, setShowNewPin] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!isAdminAuthenticated) {
        navigate('/');
        return null;
    }

    const handleChangePin = async (pinType: PinType) => {
        if (newPin.length < 4) {
            toast.error('PIN must be at least 4 digits');
            return;
        }

        if (newPin !== confirmPin) {
            toast.error('PINs do not match');
            return;
        }

        setLoading(true);
        const result = await changePin(pinType, newPin);
        setLoading(false);

        if (result.success) {
            toast.success(`${getPinTypeName(pinType)} changed successfully`);
            setChangingPin(null);
            setNewPin('');
            setConfirmPin('');
        } else {
            toast.error(result.error || 'Failed to change PIN');
        }
    };

    const getPinTypeName = (type: PinType) => {
        switch (type) {
            case 'main_app': return 'Main App PIN';
            case 'history_summary': return 'History/Summary PIN';
            case 'admin': return 'Admin Code';
            default: return 'PIN';
        }
    };

    const handleLogout = () => {
        logoutAdmin();
        navigate('/');
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <BackButton />
                <h1 className="page-title">Admin Dashboard</h1>
            </div>

            <div className="max-w-md mx-auto space-y-6">
                {/* Change Main App PIN */}
                <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Key className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">Main App PIN</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        This PIN is required to access the app on load.
                    </p>

                    {changingPin === 'main_app' ? (
                        <PinChangeForm
                            newPin={newPin}
                            setNewPin={setNewPin}
                            confirmPin={confirmPin}
                            setConfirmPin={setConfirmPin}
                            showNewPin={showNewPin}
                            setShowNewPin={setShowNewPin}
                            loading={loading}
                            onCancel={() => { setChangingPin(null); setNewPin(''); setConfirmPin(''); }}
                            onSave={() => handleChangePin('main_app')}
                        />
                    ) : (
                        <Button onClick={() => setChangingPin('main_app')} variant="outline" className="w-full">
                            Change Main App PIN
                        </Button>
                    )}
                </div>

                {/* Change History/Summary PIN */}
                <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Lock className="w-5 h-5 text-accent" />
                        <h3 className="font-semibold">History/Summary PIN</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        This PIN is required to view History and Summary pages.
                    </p>

                    {changingPin === 'history_summary' ? (
                        <PinChangeForm
                            newPin={newPin}
                            setNewPin={setNewPin}
                            confirmPin={confirmPin}
                            setConfirmPin={setConfirmPin}
                            showNewPin={showNewPin}
                            setShowNewPin={setShowNewPin}
                            loading={loading}
                            onCancel={() => { setChangingPin(null); setNewPin(''); setConfirmPin(''); }}
                            onSave={() => handleChangePin('history_summary')}
                        />
                    ) : (
                        <Button onClick={() => setChangingPin('history_summary')} variant="outline" className="w-full">
                            Change History/Summary PIN
                        </Button>
                    )}
                </div>

                {/* Change Admin Code */}
                <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <ShieldAlert className="w-5 h-5 text-destructive" />
                        <h3 className="font-semibold">Admin Code</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        This code prevents unauthorized access to this dashboard.
                    </p>

                    {changingPin === 'admin' ? (
                        <PinChangeForm
                            newPin={newPin}
                            setNewPin={setNewPin}
                            confirmPin={confirmPin}
                            setConfirmPin={setConfirmPin}
                            showNewPin={showNewPin}
                            setShowNewPin={setShowNewPin}
                            loading={loading}
                            onCancel={() => { setChangingPin(null); setNewPin(''); setConfirmPin(''); }}
                            onSave={() => handleChangePin('admin')}
                        />
                    ) : (
                        <Button onClick={() => setChangingPin('admin')} variant="outline" className="w-full">
                            Change Admin Code
                        </Button>
                    )}
                </div>

                {/* Logout */}
                <Button variant="destructive" onClick={handleLogout} className="w-full">
                    Exit Admin Dashboard
                </Button>
            </div>
        </div>
    );
}

function PinChangeForm({
    newPin, setNewPin,
    confirmPin, setConfirmPin,
    showNewPin, setShowNewPin,
    loading, onCancel, onSave
}: any) {
    return (
        <div className="space-y-4">
            <div>
                <Label>New PIN/Code</Label>
                <div className="relative">
                    <Input
                        type={showNewPin ? 'text' : 'password'}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter new PIN"
                        className="pr-10"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        onClick={() => setShowNewPin(!showNewPin)}
                    >
                        {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                </div>
            </div>
            <div>
                <Label>Confirm PIN/Code</Label>
                <Input
                    type={showNewPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Confirm new PIN"
                />
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={onCancel} className="flex-1">
                    Cancel
                </Button>
                <Button onClick={onSave} disabled={loading} className="flex-1">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
            </div>
        </div>
    );
}
