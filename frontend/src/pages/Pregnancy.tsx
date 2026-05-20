import { useEffect, useMemo, useState } from "react";
import {
  Baby,
  HeartPulse,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";

import ReactMarkdown from "react-markdown";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageProvider";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Status =
  | "not_pregnant"
  | "pregnant"
  | "has_baby";

type PregnancyProfile = {
  id?: string;
  user_id?: string;

  status: Status;

  due_date: string | null;

  baby_birth_date: string | null;

  baby_name: string | null;
};

const monthsBetween = (
  from: Date,
  to: Date
) => {
  const years =
    to.getFullYear() -
    from.getFullYear();

  const months =
    to.getMonth() - from.getMonth();

  let total =
    years * 12 + months;

  if (to.getDate() < from.getDate()) {
    total -= 1;
  }

  return Math.max(0, total);
};

export default function Pregnancy() {
  const { user } = useAuth();

  const { t, lang } = useLang();

  const [profile, setProfile] =
    useState<PregnancyProfile | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [status, setStatus] =
    useState<Status>(
      "not_pregnant"
    );

  const [dueDate, setDueDate] =
    useState("");

  const [babyBirth, setBabyBirth] =
    useState("");

  const [babyName, setBabyName] =
    useState("");

  const [
    selectedMonth,
    setSelectedMonth,
  ] = useState<number | null>(
    null
  );

  const [guidance, setGuidance] =
    useState("");

  const [generating, setGenerating] =
    useState(false);

  // ---------------- LOAD PROFILE ----------------
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } =
          await supabase
            .from("pregnancy_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

        if (error) {
          console.error(error);

          toast.error(error.message);

          return;
        }

        if (data) {
          const profileData =
            data as PregnancyProfile;

          setProfile(profileData);

          setStatus(
            profileData.status
          );

          setDueDate(
            profileData.due_date ||
            ""
          );

          setBabyBirth(
            profileData.baby_birth_date ||
            ""
          );

          setBabyName(
            profileData.baby_name ||
            ""
          );
        }
      } catch (err) {
        console.error(err);

        toast.error(
          "Failed to load profile"
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // ---------------- SUGGESTED MONTH ----------------
  const suggestedMonth =
    useMemo(() => {
      if (
        status === "pregnant" &&
        dueDate
      ) {
        const due =
          new Date(dueDate);

        const conception =
          new Date(due);

        conception.setDate(
          conception.getDate() - 280
        );

        return Math.min(
          9,
          Math.max(
            1,
            monthsBetween(
              conception,
              new Date()
            ) + 1
          )
        );
      }

      if (
        status === "has_baby" &&
        babyBirth
      ) {
        return Math.min(
          24,
          Math.max(
            0,
            monthsBetween(
              new Date(babyBirth),
              new Date()
            )
          )
        );
      }

      return null;
    }, [
      status,
      dueDate,
      babyBirth,
    ]);

  // ---------------- SAVE PROFILE ----------------
  const saveProfile = async () => {
    if (!user) {
      toast.error(
        "Please login first"
      );

      return;
    }

    if (
      status === "pregnant" &&
      !dueDate
    ) {
      toast.error(
        "Please select due date"
      );

      return;
    }

    if (
      status === "has_baby" &&
      !babyBirth
    ) {
      toast.error(
        "Please select baby birth date"
      );

      return;
    }

    setSaving(true);

    try {
      const payload = {
        user_id: user.id,

        status,

        due_date:
          status === "pregnant"
            ? dueDate
            : null,

        baby_birth_date:
          status === "has_baby"
            ? babyBirth
            : null,

        baby_name:
          status === "has_baby"
            ? babyName
            : null,
      };

      const { data, error } =
        await supabase
          .from("pregnancy_profiles")
          .upsert(payload, {
            onConflict:
              "user_id",
          })
          .select()
          .single();

      if (error) {
        console.error(error);

        toast.error(error.message);

        return;
      }

      const savedData =
        data as PregnancyProfile;

      // ✅ IMPORTANT FIX
      setProfile(savedData);

      setStatus(savedData.status);

      setDueDate(
        savedData.due_date || ""
      );

      setBabyBirth(
        savedData.baby_birth_date ||
        ""
      );

      setBabyName(
        savedData.baby_name || ""
      );

      toast.success(
        "Profile saved successfully"
      );
    } catch (err) {
      console.error(err);

      toast.error(
        "Failed to save profile"
      );
    } finally {
      setSaving(false);
    }
  };

  // ---------------- FASTAPI CALL ----------------
  const fetchGuidance = async () => {
    if (selectedMonth === null) {
      toast.error(
        "Please select month"
      );

      return;
    }

    setGenerating(true);

    setGuidance("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/ai/pregnancy-guide",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            mode: status,
            month:
              selectedMonth,
            lang,
          }),
        }
      );

      let data;

      try {
        data =
          await response.json();
      } catch {
        toast.error(
          "Invalid backend response"
        );

        return;
      }

      if (!response.ok) {
        toast.error(
          data?.detail ||
          data?.error ||
          "Backend API Error"
        );

        return;
      }

      console.log(
        "Pregnancy API:",
        data
      );

      setGuidance(
        data?.content ||
        data?.response ||
        data?.message ||
        "No response received"
      );
    } catch (err: any) {
      console.error(err);

      toast.error(
        err?.message ||
        "Cannot connect to FastAPI backend"
      );
    } finally {
      setGenerating(false);
    }
  };

  // ---------------- LOADING ----------------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />

        {t.common.loading}
      </div>
    );
  }

  // ---------------- MONTH RANGE ----------------
  const monthRange =
    status === "pregnant"
      ? Array.from(
        { length: 9 },
        (_, i) => i + 1
      )
      : Array.from(
        { length: 25 },
        (_, i) => i
      );

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-semibold flex items-center gap-2">
          <Baby className="h-7 w-7 text-primary" />

          {t.pregnancy.title}
        </h1>

        <p className="text-muted-foreground mt-1">
          {t.pregnancy.subtitle}
        </p>
      </div>

      {/* PROFILE CARD */}
      <Card>
        <CardContent className="p-6 space-y-4">

          {/* STATUS */}
          <div className="space-y-2">
            <Label>Status</Label>

            <Select
              value={status}
              onValueChange={(v) =>
                setStatus(
                  v as Status
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="not_pregnant">
                  Not Pregnant
                </SelectItem>

                <SelectItem value="pregnant">
                  Pregnant
                </SelectItem>

                <SelectItem value="has_baby">
                  Has Baby
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* DUE DATE */}
          {status === "pregnant" && (
            <div className="space-y-2">
              <Label>
                Due Date
              </Label>

              <Input
                type="date"
                value={dueDate}
                onChange={(e) =>
                  setDueDate(
                    e.target.value
                  )
                }
              />
            </div>
          )}

          {/* BABY DETAILS */}
          {status === "has_baby" && (
            <>
              <div className="space-y-2">
                <Label>
                  Baby Birth Date
                </Label>

                <Input
                  type="date"
                  value={babyBirth}
                  onChange={(e) =>
                    setBabyBirth(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Baby Name
                </Label>

                <Input
                  value={babyName}
                  onChange={(e) =>
                    setBabyName(
                      e.target.value
                    )
                  }
                  placeholder="Enter baby name"
                />
              </div>
            </>
          )}

          {/* SAVE BUTTON */}
          <Button
            onClick={saveProfile}
            disabled={saving}
          >
            {saving && (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            )}

            Save Profile
          </Button>

        </CardContent>
      </Card>

      {/* GUIDANCE CARD */}
      {status !==
        "not_pregnant" && (
          <Card>
            <CardContent className="p-6 space-y-4">

              <div className="flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-primary" />

                <h2 className="text-xl font-semibold">
                  {status ===
                    "pregnant"
                    ? "Pregnancy Guidance"
                    : "Baby Care Guidance"}
                </h2>
              </div>

              {/* MONTH SELECT */}
              <Select
                value={
                  selectedMonth?.toString() ||
                  ""
                }
                onValueChange={(v) =>
                  setSelectedMonth(
                    Number(v)
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>

                <SelectContent>

                  {monthRange.map(
                    (m) => (
                      <SelectItem
                        key={m}
                        value={m.toString()}
                      >
                        {status ===
                          "pregnant"
                          ? `Month ${m}`
                          : `${m} Month Baby`}

                        {suggestedMonth ===
                          m
                          ? " • Current"
                          : ""}
                      </SelectItem>
                    )
                  )}

                </SelectContent>
              </Select>

              {/* BUTTON */}
              <Button
                onClick={
                  fetchGuidance
                }
                disabled={
                  generating ||
                  selectedMonth ===
                  null
                }
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />

                    Loading...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />

                    Get Guidance
                  </>
                )}
              </Button>

              {/* DISCLAIMER */}
              <div className="flex items-start gap-2 rounded-xl border p-3 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mt-0.5" />

                <span>
                  This AI guidance
                  is informational
                  only. Please
                  consult a doctor.
                </span>
              </div>

              {/* RESPONSE */}
              {(generating ||
                guidance) && (
                  <div
                    className={cn(
                      "rounded-2xl border p-5 prose prose-sm max-w-none"
                    )}
                  >
                    {generating ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />

                        Thinking...
                      </div>
                    ) : (
                      <ReactMarkdown>
                        {guidance}
                      </ReactMarkdown>
                    )}
                  </div>
                )}

            </CardContent>
          </Card>
        )}

    </div>
  );
}