"use client";

import React, { useState } from "react";
import { Building2, Users, Shield, DollarSign, Globe, Bell, Palette, Database, Key, ChevronRight, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const SETTINGS_SECTIONS = [
  { id: "organization", label: "Organization", icon: Building2, description: "Company info and branding" },
  { id: "team", label: "Team & Roles", icon: Users, description: "Manage users and permissions" },
  { id: "billing", label: "Billing & Plan", icon: DollarSign, description: "Subscription and payments" },
  { id: "commissions", label: "Commission Rules", icon: DollarSign, description: "Rate configuration" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Alert preferences" },
  { id: "security", label: "Security", icon: Shield, description: "Auth and access control" },
  { id: "integrations", label: "Integrations", icon: Key, description: "API and third-party apps" },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Theme and display options" },
];

const TEAM_MEMBERS = [
  { id: "1", name: "Abebe Kebede", email: "abebe@withunion.com", role: "owner", title: "CEO & Founder", isActive: true },
  { id: "2", name: "Tigist Alemu", email: "tigist@withunion.com", role: "manager", title: "Sales Manager", isActive: true },
  { id: "3", name: "Dawit Haile", email: "dawit@withunion.com", role: "sales_rep", title: "Senior Sales Rep", isActive: true },
  { id: "4", name: "Sara Mengistu", email: "sara@withunion.com", role: "sales_rep", title: "Sales Rep", isActive: true },
];

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  admin: "bg-red-100 text-red-700",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  sales_rep: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  support: "bg-amber-100 text-amber-700",
  viewer: "bg-slate-100 text-slate-700",
};

const INTEGRATIONS = [
  { name: "OpenAI GPT-4", description: "AI assistant and proposal generation", status: "active", logo: "🤖" },
  { name: "Chapa", description: "Ethiopian payment gateway", status: "inactive", logo: "🏦" },
  { name: "Telebirr", description: "Ethio Telecom mobile money", status: "inactive", logo: "📱" },
  { name: "Stripe", description: "International payments", status: "inactive", logo: "💳" },
  { name: "Google Workspace", description: "Gmail, Calendar integration", status: "inactive", logo: "📧" },
  { name: "Slack", description: "Team notifications", status: "inactive", logo: "💬" },
  { name: "WhatsApp Business", description: "Client communication", status: "inactive", logo: "📲" },
  { name: "Telegram Bot", description: "Automated alerts", status: "inactive", logo: "✈️" },
];

export function SettingsContent() {
  const [activeSection, setActiveSection] = useState("organization");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-56 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 flex-shrink-0">
        <div className="space-y-0.5">
          {SETTINGS_SECTIONS.map(({ id, label, icon: Icon, description }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                activeSection === id
                  ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeSection === "organization" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Organization Settings</h3>
              <p className="text-sm text-slate-500 mt-0.5">Manage your company information and preferences</p>
            </div>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <span className="text-white text-2xl font-bold">W</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">WithUnion Technologies</h4>
                    <p className="text-sm text-slate-500">withunion.com</p>
                    <Button variant="outline" size="sm" className="mt-2">Upload Logo</Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Company Name</label>
                    <Input defaultValue="WithUnion Technologies" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Industry</label>
                    <Input defaultValue="Technology" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Email</label>
                    <Input defaultValue="hello@withunion.com" type="email" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Phone</label>
                    <Input defaultValue="+251911234567" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Website</label>
                    <Input defaultValue="https://withunion.com" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Currency</label>
                    <select className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 text-sm">
                      <option value="ETB">ETB — Ethiopian Birr</option>
                      <option value="USD">USD — US Dollar</option>
                      <option value="EUR">EUR — Euro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Default Tax Rate (%)</label>
                    <Input defaultValue="15" type="number" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Timezone</label>
                    <select className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 text-sm">
                      <option>Africa/Addis_Ababa (EAT +3)</option>
                      <option>UTC</option>
                    </select>
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full sm:w-auto">
                  {saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            {/* Plan Info */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900 dark:text-white">Pro Plan</h4>
                      <Badge variant="default">Current</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">Unlimited leads, clients, projects, and AI features</p>
                  </div>
                  <Button variant="outline" size="sm">Upgrade to Enterprise</Button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[["Users", "10/10"], ["Storage", "25 GB"], ["AI Queries", "500/mo"]].map(([label, value]) => (
                    <div key={label} className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{value}</div>
                      <div className="text-xs text-slate-400">{label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "team" && (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Team Members</h3>
                <p className="text-sm text-slate-500 mt-0.5">Manage users and their access levels</p>
              </div>
              <Button size="sm"><Users className="w-4 h-4" /> Invite Member</Button>
            </div>

            <Card>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {TEAM_MEMBERS.map((member) => (
                  <div key={member.id} className="flex items-center gap-4 p-4">
                    <UserAvatar name={member.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-white text-sm">{member.name}</span>
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize", ROLE_COLORS[member.role])}>
                          {member.role.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{member.email} • {member.title}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.isActive ? "success" : "secondary"} className="text-[10px]">
                        {member.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-xs">Edit</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeSection === "integrations" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Integrations</h3>
              <p className="text-sm text-slate-500 mt-0.5">Connect WithUnion CRM with your favorite tools</p>
            </div>

            <div className="space-y-3">
              {INTEGRATIONS.map((integration) => (
                <Card key={integration.name}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{integration.logo}</span>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white text-sm">{integration.name}</div>
                          <div className="text-xs text-slate-500">{integration.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {integration.status === "active" ? (
                          <Badge variant="success" className="text-[10px]">Connected</Badge>
                        ) : (
                          <Button variant="outline" size="sm" className="text-xs">Connect</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeSection === "security" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Security Settings</h3>
              <p className="text-sm text-slate-500 mt-0.5">Protect your organization with advanced security</p>
            </div>

            <div className="space-y-4">
              {[
                { title: "Two-Factor Authentication", description: "Require 2FA for all team members", enabled: false },
                { title: "Session Timeout", description: "Auto-logout after 8 hours of inactivity", enabled: true },
                { title: "Audit Logging", description: "Track all user actions and data changes", enabled: true },
                { title: "IP Allowlisting", description: "Restrict access to specific IP addresses", enabled: false },
                { title: "Data Encryption", description: "End-to-end encryption for sensitive data", enabled: true },
              ].map(({ title, description, enabled }) => (
                <Card key={title}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white text-sm">{title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{description}</div>
                      </div>
                      <div className={cn(
                        "w-10 h-5 rounded-full relative cursor-pointer transition-colors",
                        enabled ? "bg-violet-600" : "bg-slate-300 dark:bg-slate-700"
                      )}>
                        <div className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                          enabled ? "translate-x-5" : "translate-x-0.5"
                        )} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeSection === "commissions" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Commission Rules</h3>
              <p className="text-sm text-slate-500 mt-0.5">Configure automatic commission calculations for your team</p>
            </div>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Default Commission Rate (%)</label>
                    <Input defaultValue="5" type="number" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Sales Rep Rate (%)</label>
                    <Input defaultValue="5" type="number" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Manager Override Rate (%)</label>
                    <Input defaultValue="2" type="number" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Monthly Bonus Threshold</label>
                    <Input defaultValue="1000000" type="number" />
                  </div>
                </div>
                <Button onClick={handleSave}>
                  {saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save Commission Rules"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {!["organization", "team", "integrations", "security", "commissions"].includes(activeSection) && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-slate-400">
              <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Coming Soon</h3>
              <p className="text-sm mt-1">This settings section is under development</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Needed import
function Settings({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
