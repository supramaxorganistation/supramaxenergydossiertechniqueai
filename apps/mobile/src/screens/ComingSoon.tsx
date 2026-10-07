import React from 'react';
import { Screen, Card } from '../components/Screen';
import { EmptyState } from '../components/ui';

/** Generic placeholder for screens delivered in a later phase. */
export default function ComingSoon({
  title,
  message = 'Cet écran arrive dans une phase ultérieure du plan.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <Screen title={title}>
      <Card>
        <EmptyState icon="clock" title={title || 'Bientôt disponible'} subtitle={message} />
      </Card>
    </Screen>
  );
}
