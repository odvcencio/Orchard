'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProfileTab } from '@/components/settings/profile-tab';
import { SSHKeysTab } from '@/components/settings/ssh-keys-tab';
import { PasskeysTab } from '@/components/settings/passkeys-tab';

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="ssh-keys">SSH Keys</TabsTrigger>
          <TabsTrigger value="passkeys">Passkeys</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="ssh-keys" className="mt-6">
          <SSHKeysTab />
        </TabsContent>
        <TabsContent value="passkeys" className="mt-6">
          <PasskeysTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
