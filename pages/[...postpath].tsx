import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { GraphQLClient, gql } from 'graphql-request';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
	const endpoint = 'https://dfhndrfh.infinityfree.me/graphql';
	const graphQLClient = new GraphQLClient(endpoint);
	const referringURL = ctx.req.headers?.referer || null;
	
    // FIX 2: pathArr আনডিফাইন্ড বা স্ট্রিং হলে তা নিরাপদে হ্যান্ডেল করা
	const pathArr = ctx.query.postpath;
	const path = Array.isArray(pathArr) ? pathArr.join('/') : (pathArr || '');
	
	console.log(path);
	const fbclid = ctx.query.fbclid;

	// redirect if facebook is the referer or request contains fbclid
	if (referringURL?.includes('facebook.com') || fbclid) {
		return {
			redirect: {
				permanent: false,
				destination: `https://saveourstateok.org/${encodeURI(path as string)}`,
			},
		};
	}

	const query = gql`
		{
			post(id: "/${path}/", idType: URI) {
				id
				excerpt
				title
				link
				dateGmt
				modifiedGmt
				content
				author {
					node {
						name
					}
				}
				featuredImage {
					node {
						sourceUrl
						altText
					}
				}
			}
		}
	`;

	const data = await graphQLClient.request(query);
	
	if (!data.post) {
		return {
			notFound: true,
		};
	}
	
	return {
		props: {
			path,
			post: data.post,
			host: ctx.req.headers.host || '',
		},
	};
};

interface PostProps {
	post: any;
	host: string;
	path: string;
}

const Post: React.FC<PostProps> = (props) => {
	const { post, host } = props;

	// to remove tags from excerpt
	const removeTags = (str: string) => {
		if (str === null || str === '') return '';
		else str = str.toString();
		return str.replace(/(<([^>]+)>)/gi, '').replace(/\[[^\]]*\]/, '');
	};

	return (
		<>
			<Head>
				<meta property="og:title" content={post.title} />
				<meta property="og:description" content={removeTags(post.excerpt)} />
				<meta property="og:type" content="article" />
				<meta property="og:locale" content="en_US" />
				<meta property="og:site_name" content={host.split('.')[0]} />
				<meta property="article:published_time" content={post.dateGmt} />
				<meta property="article:modified_time" content={post.modifiedGmt} />
				
                {/* FIX 1: মেটা ইমেজগুলো যদি থাকে, তবেই কেবল রেন্ডার হবে */}
				{post.featuredImage?.node?.sourceUrl && (
					<>
						<meta property="og:image" content={post.featuredImage.node.sourceUrl} />
						<meta
							property="og:image:alt"
							content={post.featuredImage.node.altText || post.title}
						/>
					</>
				)}
				<title>{post.title}</title>
			</Head>
			<div className="post-container">
				<h1>{post.title}</h1>
				
                {/* FIX 1: ইমেজ এলিমেন্ট যদি থাকে, তবেই কেবল রেন্ডার হবে */}
				{post.featuredImage?.node?.sourceUrl && (
					<img
						src={post.featuredImage.node.sourceUrl}
						alt={post.featuredImage.node.altText || post.title}
					/>
				)}
				
				<article dangerouslySetInnerHTML={{ __html: post.content }} />
			</div>
		</>
	);
};

export default Post;
