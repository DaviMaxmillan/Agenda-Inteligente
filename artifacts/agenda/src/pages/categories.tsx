import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Tag, Plus, Pencil, Trash2 } from "lucide-react";
import {
  useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  getListCategoriesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Category } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";

const PRESET_COLORS = [
  "#e11d48", "#ea580c", "#d97706", "#ca8a04", "#65a30d",
  "#16a34a", "#059669", "#0d9488", "#0891b2", "#0284c7",
  "#2563eb", "#4f46e5", "#7c3aed", "#9333ea", "#c026d3"
];

export default function CategoriesPage() {
  const { t } = useTranslation();
  const { data: categories, isLoading } = useListCategories();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight">{t("categories.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("categories.subtitle")}</p>
          </div>
          <CategoryFormDialog />
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : categories?.length ? (
            categories.map(category => (
              <CategoryRow key={category.id} category={category} />
            ))
          ) : (
            <div className="text-center py-20 bg-card rounded-xl border border-dashed border-border/50">
              <Tag className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-lg font-medium">{t("categories.noCategoriesTitle")}</h3>
              <p className="text-muted-foreground mt-1 mb-4">{t("categories.noCategoriesDesc")}</p>
              <CategoryFormDialog trigger={<Button variant="outline"><Plus className="w-4 h-4 mr-2" />{t("categories.addCategory")}</Button>} />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteCategory = useDeleteCategory();

  const handleDelete = () => {
    deleteCategory.mutate(
      { id: category.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          toast({ title: t("toasts.categoryDeleted"), description: t("toasts.categoryDeletedDesc", { name: category.name }) });
        },
        onError: () => {
          toast({ title: t("toasts.error"), description: t("toasts.errorCategory"), variant: "destructive" });
        }
      }
    );
  };

  const count = category.eventCount;
  const eventsLabel = t(count === 1 ? "categories.events_one" : "categories.events_other", { count });

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden hover-elevate transition-all">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm border border-black/10"
            style={{ backgroundColor: category.color }}
          >
            <Tag className="w-5 h-5 drop-shadow-sm" />
          </div>
          <div>
            <h3 className="font-semibold text-lg" data-testid={`category-name-${category.id}`}>{category.name}</h3>
            <p className="text-sm text-muted-foreground">{eventsLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CategoryFormDialog category={category} />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("categories.deleteTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("categories.deleteDesc", { name: category.name })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("eventDetail.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">{t("eventDetail.delete")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryFormDialog({ category, trigger }: { category?: Category, trigger?: React.ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const categorySchema = z.object({
    name: z.string().min(1, t("categories.nameRequired")),
    color: z.string().min(4, t("categories.colorRequired")).regex(/^#/, t("categories.colorInvalid")),
  });

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || "",
      color: category?.color || PRESET_COLORS[0],
    },
  });

  const onSubmit = (values: z.infer<typeof categorySchema>) => {
    if (category) {
      updateCategory.mutate(
        { id: category.id, data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
            toast({ title: t("toasts.categoryUpdated") });
            setOpen(false);
          }
        }
      );
    } else {
      createCategory.mutate(
        { data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
            toast({ title: t("toasts.categoryCreated") });
            setOpen(false);
            form.reset();
          }
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10">
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{category ? t("categories.editCategory") : t("categories.newCategory")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("categories.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("categories.namePlaceholder")} data-testid="input-cat-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("categories.color")}</FormLabel>
                  <div className="grid grid-cols-5 gap-3 pt-2">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`w-10 h-10 rounded-full border-2 transition-all ${field.value === color ? 'border-primary ring-2 ring-primary/30 ring-offset-2 scale-110' : 'border-transparent hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => field.onChange(color)}
                      />
                    ))}
                  </div>
                  <FormControl>
                    <div className="flex items-center gap-3 mt-4">
                      <Input type="color" className="w-12 h-12 p-1 cursor-pointer" {...field} />
                      <Input type="text" className="uppercase font-mono flex-1" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending}>
                {category ? t("categories.saveChanges") : t("categories.createCategory")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
