import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { DEFAULT_TEMPLATE_FIELDS, type CertField } from "@/lib/cert-template";
import { TemplateEditor } from "./template-editor";

export default async function CertTemplateEditorPage({
  params,
}: {
  params: Promise<{ slug: string; courseId: string }>;
}) {
  const { slug, courseId } = await params;
  const session = await auth();
  if (!session) return null;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      passScore: true,
      lab: { select: { id: true, slug: true, name: true } },
      certificateTemplate: { select: { backgroundUrl: true, fieldsJson: true, name: true } },
    },
  });
  if (!course || course.lab.slug !== slug) notFound();
  if (!(await canManageLab(session.user.id, session.user.role, course.lab.id))) {
    redirect(`/labs/${slug}/courses`);
  }

  const tpl = course.certificateTemplate;
  const initialFields =
    (tpl?.fieldsJson as { fields?: CertField[] } | null)?.fields ?? DEFAULT_TEMPLATE_FIELDS;

  return (
    <TemplateEditor
      labSlug={slug}
      courseId={course.id}
      courseTitle={course.title}
      labName={course.lab.name}
      passScore={course.passScore}
      initialBackgroundUrl={tpl?.backgroundUrl ?? ""}
      initialFields={initialFields}
      initialName={tpl?.name ?? `Template ${course.title}`}
    />
  );
}
