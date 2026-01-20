import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "@/components/BackButton";
import { PinDialog } from "@/components/PinDialog";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Key, Shield, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

type PinType = "main_app" | "history_summary" | "owner";

export default function OwnerSettings() {
  const navigate = useNavigate();
  const { isOwnerAuthenticated, verifyPin, changePin, logoutOwner } = useAuth();
  const [showPinDialog, setShowPinDialog] = useState(!isOwnerAuthenticated);

  const [changingPin, setChangingPin] = useState<PinType | null>(null);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showNewPin, setShowNewPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOwnerPinSubmit = async (pin: string) => {
    return await verifyPin(pin, "owner");
  };

  const handlePinCancel = () => {
    setShowPinDialog(false);
    navigate("/");
  };

  const handleChangePin = async (pinType: PinType) => {
    if (newPin.length < 4) {
      toast.error("PIN must be at least 4 digits");
      return;
    }

    if (newPin !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }

    setLoading(true);
    const result = await changePin(pinType, newPin);
    setLoading(false);

    if (result.success) {
      toast.success(`${getPinTypeName(pinType)} changed successfully`);
      setChangingPin(null);
      setNewPin("");
      setConfirmPin("");
    } else {
      toast.error(result.error || "Failed to change PIN");
    }
  };

  const getPinTypeName = (type: PinType) => {
    switch (type) {
      case "main_app":
        return "Main App PIN";
      case "history_summary":
        return "History/Summary PIN";
      case "owner":
        return "Owner PIN";
    }
  };

  const handleLogout = () => {
    logoutOwner();
    navigate("/");
  };

  if (!isOwnerAuthenticated && showPinDialog) {
    return (
      <PinDialog
        open={showPinDialog}
        onOpenChange={handlePinCancel}
        title="Owner Access"
        description="Enter Owner PIN to access settings (Default: 9999)"
        onSubmit={handleOwnerPinSubmit}
        onSuccess={() => setShowPinDialog(false)}
      />
    );
  }

  if (!isOwnerAuthenticated) {
    navigate("/");
    return null;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <BackButton />
        <h1 className="page-title">Owner Settings</h1>
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

          {changingPin === "main_app" ? (
            <div className="space-y-4">
              <div>
                <Label>New PIN</Label>
                <div className="relative">
                  <Input
                    type={showNewPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={newPin}
                    onChange={(e) =>
                      setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
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
                    {showNewPin ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label>Confirm PIN</Label>
                <Input
                  type={showNewPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmPin}
                  onChange={(e) =>
                    setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Confirm new PIN"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setChangingPin(null);
                    setNewPin("");
                    setConfirmPin("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleChangePin("main_app")}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setChangingPin("main_app")}
              variant="outline"
              className="w-full"
            >
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

          {changingPin === "history_summary" ? (
            <div className="space-y-4">
              <div>
                <Label>New PIN</Label>
                <div className="relative">
                  <Input
                    type={showNewPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={newPin}
                    onChange={(e) =>
                      setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
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
                    {showNewPin ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label>Confirm PIN</Label>
                <Input
                  type={showNewPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmPin}
                  onChange={(e) =>
                    setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Confirm new PIN"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setChangingPin(null);
                    setNewPin("");
                    setConfirmPin("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleChangePin("history_summary")}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setChangingPin("history_summary")}
              variant="outline"
              className="w-full"
            >
              Change History/Summary PIN
            </Button>
          )}
        </div>

        {/* Change Owner PIN */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold">Owner PIN</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            This PIN grants access to owner settings and can change all other
            PINs.
          </p>

          {changingPin === "owner" ? (
            <div className="space-y-4">
              <div>
                <Label>New PIN</Label>
                <div className="relative">
                  <Input
                    type={showNewPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={newPin}
                    onChange={(e) =>
                      setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
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
                    {showNewPin ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label>Confirm PIN</Label>
                <Input
                  type={showNewPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmPin}
                  onChange={(e) =>
                    setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Confirm new PIN"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setChangingPin(null);
                    setNewPin("");
                    setConfirmPin("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleChangePin("owner")}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setChangingPin("owner")}
              variant="outline"
              className="w-full"
            >
              Change Owner PIN
            </Button>
          )}
        </div>

        {/* Logout */}
        <Button variant="destructive" onClick={handleLogout} className="w-full">
          Exit Owner Mode
        </Button>
      </div>
    </div>
  );
}
