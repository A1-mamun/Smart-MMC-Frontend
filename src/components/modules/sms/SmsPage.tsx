"use client";

import { useState } from "react";
import { Wallet, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RecipientsPicker from "./RecipientsPicker";
import SmsComposer from "./SmsComposer";
import { useGetSmsBalanceQuery } from "@/redux/features/sms/sms";
import type { TSmsRecipient } from "@/types/sms";

const SmsPage = () => {
  const [recipients, setRecipients] = useState<TSmsRecipient[]>([]);
  const { data: balanceData, isFetching: balanceLoading } =
    useGetSmsBalanceQuery();

  const balance = balanceData?.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">SMS</h2>
        <p className="text-sm text-muted-foreground">
          Send text messages to students individually or in bulk. Powered by
          BulkSMSBD.net.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" />
              Account balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {balanceLoading
                ? "…"
                : balance
                  ? balance.balance.toLocaleString()
                  : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {balance
                ? `Updated ${new Date(balance.fetchedAt).toLocaleTimeString()}`
                : "Live from BulkSMSBD.net"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Selected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{recipients.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Recipients ready to send
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>· Use the cascading filter to target a cohort.</p>
            <p>· Up to 1600 characters per SMS (multi-part billed automatically).</p>
            <p>· Invalid mobile numbers are skipped and reported in the toast.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecipientsPicker initial={recipients} onChange={setRecipients} />
        <SmsComposer
          recipients={recipients}
          resetMessageOnRecipientChange
        />
      </div>
    </div>
  );
};

export default SmsPage;