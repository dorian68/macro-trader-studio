UPDATE blog_posts 
SET cover_image = regexp_replace(cover_image, '\.(jpg|png)$', '.webp') 
WHERE cover_image IS NOT NULL 
  AND cover_image LIKE '/images/blog/%'
  AND cover_image NOT LIKE '%.webp';