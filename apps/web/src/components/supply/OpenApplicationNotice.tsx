import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";

/**
 * WHAT A SETUP FORM SHOWS INSTEAD OF ITSELF WHILE AN APPLICATION IS OPEN.
 *
 * The owner, agent and professional forms used to open whatever was on file,
 * so a person whose application was still with a reviewer (or waiting on
 * their own answer) could fill in four or six screens and file a second one
 * behind it. Both filing actions now refuse that, and this says so before
 * anything is typed, with the reference and the one place to follow it.
 *
 * A server component: a heading, one sentence and one link.
 */
export function OpenApplicationNotice({
  heading,
  reference,
  copy,
}: {
  /** The form's own name, "Register as an owner", so the back control and the title say where this is. */
  heading: string;
  reference: string;
  copy: { title: string; body: string; action: string };
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={heading} fallback="/profile/setup" />
      <EmptyState
        icon="doc-shield"
        title={copy.title}
        body={copy.body.replace("{reference}", reference)}
        action={
          <ButtonLink href="/profile/application" variant="primary" size="lg">
            {copy.action}
          </ButtonLink>
        }
        data-testid="open-application-notice"
      />
    </div>
  );
}
