import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { GraphQLClient, gql } from 'graphql-request';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
	const endpoint = 'https://dev-test8568.pantheonsite.io/graphql';
	const graphQLClient = new GraphQLClient(endpoint);

	const referringURL = ctx.req.headers?.referer || null;

	const pathArr = Array.isArray(ctx.query.postpath)
		? ctx.query.postpath
		: [ctx.query.postpath || ''];

	const path = pathArr.join('/');

	console.log('Post path:', path);

	const fbclid = ctx.query.fbclid;

	// Redirect Facebook traffic
	if (referringURL?.includes('facebook.com') || fbclid) {
		return {
			redirect: {
				permanent: false,
				destination: `https://saveourstateok.org/${encodeURI(path)}`,
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

	let data: any;

	try {
		data = await graphQLClient.request(query);
	} catch (error) {
		console.error('GraphQL Error:', error);

		return {
			notFound: true,
		};
	}

	if (!data?.post) {
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

	const removeTags = (str: string) => {
		if (!str) return '';

		return str
			.toString()
			.replace(/(<([^>]+)>)/gi, '')
			.replace(/\[[^\]]*\]/, '');
	};

	// Featured image safely handle করা হয়েছে
	const imageUrl = post?.featuredImage?.node?.sourceUrl || '';
	const imageAlt =
		post?.featuredImage?.node?.altText || post?.title || '';

	return (
		<>
			<Head>
				<meta
					property="og:title"
					content={post?.title || ''}
				/>

				<meta
					property="og:description"
					content={removeTags(post?.excerpt || '')}
				/>

				<meta property="og:type" content="article" />

				<meta property="og:locale" content="en_US" />

				<meta
					property="og:site_name"
					content={host ? host.split('.')[0] : ''}
				/>

				<meta
					property="article:published_time"
					content={post?.dateGmt || ''}
				/>

				<meta
					property="article:modified_time"
					content={post?.modifiedGmt || ''}
				/>

				{imageUrl && (
					<>
						<meta
							property="og:image"
							content={imageUrl}
						/>

						<meta
							property="og:image:alt"
							content={imageAlt}
						/>
					</>
				)}

				<title>{post?.title || 'Post'}</title>
			</Head>

			<div className="post-container">
				<h1>{post?.title}</h1>

				{imageUrl && (
					<img
						src={imageUrl}
						alt={imageAlt}
					/>
				)}

				<article
					dangerouslySetInnerHTML={{
						__html: post?.content || '',
					}}
				/>
			</div>
		</>
	);
};

export default Post;
