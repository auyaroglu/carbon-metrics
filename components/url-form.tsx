"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"

const formSchema = z.object({
  url: z.string().url("Geçerli bir URL giriniz"),
})

interface UrlFormProps {
  onSubmit: (url: string) => void;
}

export function UrlForm({ onSubmit }: UrlFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
    },
  })

  async function handleSubmit(values: z.infer<typeof formSchema>) {
    try {
      const response = await fetch("/api/metrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: values.url,
          cls: Math.random(), // Simüle edilmiş değerler
          lcp: Math.random() * 1000,
          inp: Math.random() * 100,
        }),
      });

      if (!response.ok) {
        throw new Error("API isteği başarısız oldu");
      }

      toast({
        title: "URL başarıyla eklendi",
        description: values.url,
      });

      onSubmit(values.url);
      form.reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "URL eklenirken bir hata oluştu.",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Web Sitesi URL'i</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Analiz Et</Button>
      </form>
    </Form>
  )
} 